import sys
import pandas as pd
import numpy as np
import json
import argparse
import os 
from datetime import datetime


def seconds_to_wdyhms(seconds):
    if pd.isna(seconds) or seconds is None:
        return ""
    total_seconds = int(seconds)
    if total_seconds == 0:
        return "0s"
    SECS_PER_MIN, SECS_PER_HOUR, SECS_PER_DAY, SECS_PER_WEEK = 60, 3600, 86400, 604800
    parts = []
    weeks = total_seconds // SECS_PER_WEEK
    if weeks > 0:
        parts.append(f"{weeks} هفته، ")
        total_seconds %= SECS_PER_WEEK
    days = total_seconds // SECS_PER_DAY
    if days > 0:
        parts.append(f"{days} روز، ")
        total_seconds %= SECS_PER_DAY
    hours = total_seconds // SECS_PER_HOUR
    if hours > 0:
        parts.append(f"{hours:02d} ساعت، ")
        total_seconds %= SECS_PER_HOUR
    minutes = total_seconds // SECS_PER_MIN
    if minutes > 0:
        parts.append(f"{minutes:02d} دقیقه، ")
        total_seconds %= SECS_PER_MIN
    if total_seconds > 0 or not parts:
        parts.append(f"{total_seconds:02d} ثانیه")
    return " ".join(parts)

def preprocess_dataframe(data):
    data['Timestamp'] = pd.to_datetime(data['Timestamp']) 
    
    data = data.sort_values(by=['CaseID', 'Timestamp'])
    data['Target_Activity'] = data.groupby('CaseID')['Activity'].shift(-1)
    data['Target_Timestamp'] = data.groupby('CaseID')['Timestamp'].shift(-1)
    
    transitions_data = data.dropna(subset=['Target_Activity']).copy()
    transitions_data['Duration_Seconds'] = (transitions_data['Target_Timestamp'] - transitions_data['Timestamp']).dt.total_seconds()
    
    
    edge_metrics = transitions_data.groupby(['Activity', 'Target_Activity']).agg(
        Case_Count=('CaseID', 'count'), 
        Total_Duration_Seconds=('Duration_Seconds', 'sum'),
        Mean_Duration_Seconds=('Duration_Seconds', 'mean'),
    ).reset_index()
    
    edge_metrics['Tooltip_Total_Time'] = edge_metrics['Total_Duration_Seconds'].apply(seconds_to_wdyhms)
    edge_metrics['Tooltip_Mean_Time'] = edge_metrics['Mean_Duration_Seconds'].apply(seconds_to_wdyhms)

    # edge_metrics = edge_metrics.drop(columns=['Total_Duration_Seconds', 'Mean_Duration_Seconds'])

    edge_metrics.columns = [
        'Source_Activity', 
        'Target_Activity', 
        'Case_Count', 
        'Total_Duration_Seconds',
        'Mean_Duration_Seconds',
        'Tooltip_Total_Time',
        'Tooltip_Mean_Time'
    ]
    
    return edge_metrics

def apply_filters(df, start_date=None, end_date=None, min_cases=None, max_cases=None, min_mean_time_seconds=None, max_mean_time_seconds=None, weight_metric='cases', time_unit='s'):
    df = df.sort_values(by=['CaseID', 'Timestamp'])
    df['Event_Rank'] = df.groupby('CaseID').cumcount() + 1
    df['Max_Rank'] = df.groupby('CaseID')['Event_Rank'].transform('max')

    df['Case_Start_Time'] = df.groupby('CaseID')['Timestamp'].transform('min')
    df['Seconds_From_Start'] = (df['Timestamp'] - df['Case_Start_Time']).dt.total_seconds()
    
    if start_date:
        df = df[df['Timestamp'] >= pd.to_datetime(start_date)]
    if end_date:
        df = df[df['Timestamp'] <= pd.to_datetime(end_date)]

    variants_df, start_nodes, end_nodes = get_variants(df)
    processed_df = preprocess_dataframe(df)

    if min_cases is not None:
        processed_df = processed_df[processed_df['Case_Count'] >= min_cases]
    if max_cases is not None:
        processed_df = processed_df[processed_df['Case_Count'] <= max_cases]

    if min_mean_time_seconds is not None:
        processed_df = processed_df[processed_df['Mean_Duration_Seconds'] >= min_mean_time_seconds]
    if max_mean_time_seconds is not None:
        processed_df = processed_df[processed_df['Mean_Duration_Seconds'] <= max_mean_time_seconds]

    if weight_metric == 'mean_time':
         divisor_map = {'s': 1, 'm': 60, 'h': 3600, 'd': 86400, 'w': 604800}
         divisor = divisor_map.get(time_unit, 1)
         unit_label_map = {'s': 'ثانیه', 'm': 'دقیقه', 'h': 'ساعت', 'd': 'روز', 'w': 'هفته'}
         unit_label = unit_label_map.get(time_unit, 's')

         processed_df['Weight_Value'] = processed_df['Mean_Duration_Seconds'] / divisor
         processed_df['Edge_Label'] = processed_df['Weight_Value'].round(2).astype(str) + f" {unit_label}"     
    else: # default to 'cases'
         processed_df['Weight_Value'] = processed_df['Case_Count']
         processed_df['Edge_Label'] = processed_df['Case_Count'].astype(int).astype(str)
         
    
    # processed_df = processed_df.drop(columns=['Total_Duration_Seconds', 'Mean_Duration_Seconds'])
    return processed_df, variants_df, start_nodes, end_nodes

def load_dataframe(file_path, format_type):
    if format_type == 'csv':
        df=  pd.read_csv(file_path)
    elif format_type == 'pkl':
        df = pd.read_pickle(file_path)
    df.columns = ['CaseID', 'Activity', 'Timestamp']
    df['Timestamp'] = pd.to_datetime(df['Timestamp'])
    return df
    
def get_variants(df, min_cases=None):
    case_col = 'CaseID'
    activity_col = 'Activity'
    
    grouped = df.groupby(case_col).agg({
        activity_col: tuple,
        'Seconds_From_Start': list,
        'Event_Rank': list,
        'Max_Rank': list 
    }).reset_index()
    

    grouped['Is_True_Start'] = grouped['Event_Rank'].apply(lambda r: 1 if r[0] == 1 else 0)
    
 
    grouped['Is_True_End'] = grouped.apply(
        lambda row: 1 if row['Event_Rank'][-1] == row['Max_Rank'][0] else 0, axis=1
    )

    grouped.rename(columns={activity_col: 'Variant_Path'}, inplace=True)
    grouped.rename(columns={'Seconds_From_Start': 'Times_List'}, inplace=True)


    variant_stats = grouped.groupby('Variant_Path').agg(
        Frequency=('Variant_Path', 'count'),
        Avg_Timings=('Times_List', lambda x: np.mean(x.tolist(), axis=0).tolist()),
        Total_Timings=('Times_List', lambda x: np.sum(x.tolist(), axis=0).tolist()),
        True_Start_Count=('Is_True_Start', 'sum'),
        True_End_Count=('Is_True_End', 'sum')      
    ).reset_index()

    if min_cases is not None:
        variant_stats = variant_stats[variant_stats['Frequency'] >= min_cases]

    if variant_stats.empty:
        return pd.DataFrame(), [], []

    total_cases = variant_stats['Frequency'].sum()
    variant_stats['Percentage'] = (variant_stats['Frequency'] / total_cases * 100)
    variant_stats = variant_stats.sort_values(by='Frequency', ascending=False)
    
    target_coverage = 0.95
    current_coverage = 0.0
    keep_indices = []

    for index, row in variant_stats.iterrows():
        current_coverage += (row['Percentage'] / 100)
        keep_indices.append(index)
        if current_coverage >= target_coverage:
            break
            
    pareto_variants = variant_stats.loc[keep_indices].copy()
    pareto_variants['Variant_Path'] = pareto_variants['Variant_Path'].apply(list)

    start_counts = {}
    end_counts = {}

    for index, row in pareto_variants.iterrows():
        path = row['Variant_Path']
        if len(path) > 0:
            s_node = path[0]
            e_node = path[-1]
            
            if row['True_Start_Count'] > 0:
                start_counts[s_node] = start_counts.get(s_node, 0) + row['True_Start_Count']
            
            if row['True_End_Count'] > 0:
                end_counts[e_node] = end_counts.get(e_node, 0) + row['True_End_Count']

    def get_top_nodes(counts_dict, coverage_threshold=0.90):
        if not counts_dict: return []
        sorted_nodes = sorted(counts_dict.items(), key=lambda x: x[1], reverse=True)
        total_count = sum(counts_dict.values())
        if total_count == 0: return []
        
        current_sum = 0
        selected_nodes = []
        for node, count in sorted_nodes:
            current_sum += count
            selected_nodes.append(node)
            if (current_sum / total_count) >= coverage_threshold:
                break
        
        if not selected_nodes and sorted_nodes:
            selected_nodes.append(sorted_nodes[0][0])
            
        return selected_nodes
    
    final_start_nodes = get_top_nodes(start_counts, coverage_threshold=0.90)
    final_end_nodes = get_top_nodes(end_counts, coverage_threshold=0.90)
    
    pareto_variants['Avg_Timings'] = pareto_variants['Avg_Timings'].apply(lambda x: [round(t, 2) for t in x])
    pareto_variants['Total_Timings'] = pareto_variants['Total_Timings'].apply(lambda x: [round(t, 2) for t in x])

    return pareto_variants, final_start_nodes, final_end_nodes


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process data and generate a layouted graph JSON.")
    parser.add_argument('--format', type=str, required=True, choices=['csv', 'pkl'])
    parser.add_argument('--input-path', type=str, required=True)
    parser.add_argument('--start-date', type=str, required=False)
    parser.add_argument('--end-date', type=str, required=False)
    parser.add_argument('--min-cases', type=int, required=False)
    parser.add_argument('--max-cases', type=int, required=False)
    parser.add_argument('--min-mean-time', type=int, required=False, help="Minimum mean time in seconds")
    parser.add_argument('--max-mean-time', type=int, required=False, help="Maximum mean time in seconds")
    parser.add_argument('--weight-metric', type=str, required=False, default='cases', choices=['cases', 'mean_time'], help="Metric to use for edge weight (label, thickness, color)")
    parser.add_argument('--time-unit', type=str, required=False, default='d', choices=['s', 'm', 'h', 'd', 'w'], help="Unit for mean_time if used as weight metric (s=seconds, m=minutes, h=hours, d=days, w=weeks)")
    args = parser.parse_args()

    if sys.stdout.encoding != 'UTF-8':
        sys.stdout.reconfigure(encoding='utf-8')

    try:
        df = load_dataframe(args.input_path, args.format)
        
        processed_df, variants_df, start_nodes, end_nodes = apply_filters(
            df,
            start_date=args.start_date,
            end_date=args.end_date,
            min_cases=args.min_cases,
            max_cases=args.max_cases,
            min_mean_time_seconds=args.min_mean_time,
            max_mean_time_seconds=args.max_mean_time,
            weight_metric=args.weight_metric,
            time_unit=args.time_unit
        )

        final_df = processed_df[[
             'Source_Activity', 
             'Target_Activity', 
            #  'Case_Count', 
             'Mean_Duration_Seconds',
             'Tooltip_Total_Time', 
             'Tooltip_Mean_Time',
             'Weight_Value', 
             'Edge_Label' 
         ]]
        
        
                
        final_output = final_df.to_dict(orient='records')
        variants_df = variants_df.to_dict(orient='records')
        
        print(json.dumps({
            "graphData": final_output,
            "variants" : variants_df,
            "startActivities": start_nodes, 
            "endActivities": end_nodes
        }, ensure_ascii=False))
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)