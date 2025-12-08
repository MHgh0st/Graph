import sys
import polars as pl
import numpy as np
import json
import argparse
import pandas as pd # Still needed for reading pickles if necessary

def format_seconds_to_days_expr(col_name):
    """
    Polars Expression to convert seconds to formatted string (Vectorized).
    Equivalent to original seconds_to_days but massive speedup.
    """
    days = pl.col(col_name) / 86400
    return (
        pl.when(pl.col(col_name) == 0)
        .then(pl.lit("0s"))
        .when(pl.col(col_name).is_null())
        .then(pl.lit(""))
        .otherwise(
            pl.format("{} روز ", days.round(2))
        )
    )

def load_dataframe_lazy(file_path, format_type):
    """
    Loads data lazily based on format.
    """
    q = None
    if format_type == 'csv':
        # try_parse_dates uses Rust-based parser which is very fast
        q = pl.scan_csv(file_path, try_parse_dates=True)
    elif format_type == 'parquet':
        q = pl.scan_parquet(file_path)
    elif format_type == 'pkl':
        # Polars cannot scan pickles lazily directly, so we read eagerly then convert to lazy
        pdf = pd.read_pickle(file_path)
        q = pl.from_pandas(pdf).lazy()
    
    # Standardize columns
    # Assuming the file has 3 columns: CaseID, Activity, Timestamp (by position or name)
    # We rename them to be sure.
    current_cols = q.collect_schema().names()
    if len(current_cols) >= 3:
        q = q.rename({
            current_cols[0]: 'CaseID',
            current_cols[1]: 'Activity',
            current_cols[2]: 'Timestamp'
        })
    
    # Ensure Timestamp is datetime
    q = q.with_columns(pl.col('Timestamp').cast(pl.Datetime))
    
    return q

def get_variants_logic(df_lazy, min_cases=None):
    """
    Calculates variants using Polars fast list aggregations.
    """
    # 1. Aggregate per Case to get Paths and Timings
    # using native Polars list features avoids python objects overhead
    cases_agg = df_lazy.group_by('CaseID').agg([
        pl.col('Activity').alias('Variant_Path'),
        pl.col('Seconds_From_Start').alias('Times_List'),
        # Check start/end logic:
        # Is_True_Start: If Event_Rank (which is sorted) is 1
        (pl.col('Event_Rank').first() == 1).cast(pl.Int32).alias('Is_True_Start'),
        # Is_True_End: If last Event_Rank == Max_Rank
        (pl.col('Event_Rank').last() == pl.col('Max_Rank').first()).cast(pl.Int32).alias('Is_True_End')
    ])

    # 2. Group by Variant_Path to get stats
    # We cannot do complex numpy list averaging inside Lazy Polars easily for variable lengths.
    # Strategy: Aggregate counts/sums here, then collect ONLY the aggregated variants (small data)
    # and do the numpy math in memory.
    
    variants_agg = cases_agg.group_by('Variant_Path').agg([
        pl.len().alias('Frequency'),
        pl.col('Times_List'), # Collects list of lists
        pl.col('Is_True_Start').sum().alias('True_Start_Count'),
        pl.col('Is_True_End').sum().alias('True_End_Count')
    ])

    # 3. Filter min_cases (Pushdown optimization)
    if min_cases is not None:
        variants_agg = variants_agg.filter(pl.col('Frequency') >= min_cases)

    # Trigger calculation for Variants (This is usually small, e.g. < 10k rows)
    variants_df = variants_agg.collect()

    if variants_df.is_empty():
        return [], [], []

    # 4. Pareto Logic (In Eager Polars now)
    total_cases = variants_df['Frequency'].sum()
    variants_df = variants_df.with_columns(
        (pl.col('Frequency') / total_cases * 100).alias('Percentage')
    ).sort('Frequency', descending=True)

    # Calculate Cumulative Sum to find cut-off
    variants_df = variants_df.with_columns(
        (pl.col('Percentage').cum_sum() / 100).alias('cum_coverage')
    )
    
    # Filter 95% Pareto
    # We take rows where cum_coverage previous row < 0.95 (to ensure we include the one that crosses it)
    # Or simply: take head while coverage < 0.95
    target_coverage = 0.95
    # Find the index where we cross the threshold
    cutoff_idx = variants_df.filter(pl.col('cum_coverage') >= target_coverage).head(1)
    
    if not cutoff_idx.is_empty():
        # Get the cum_coverage value to filter
        limit_val = cutoff_idx['cum_coverage'][0]
        pareto_variants = variants_df.filter(pl.col('cum_coverage') <= limit_val)
    else:
        # If never reaches 95 (unlikely unless empty), take all
        pareto_variants = variants_df

    # 5. Calculate Avg/Total Timings using Numpy (fastest for List of Lists structure)
    # Polars lists are converted to python lists for this specific complex math operation
    # Since we already filtered Pareto, this is very fast.
    
    def calc_timings(times_series, func):
        # times_series is a Series of Lists of Lists
        rows = times_series.to_list()
        results = []
        for lst in rows:
            # lst is list of lists (e.g. [[0, 10], [0, 12]])
            if not lst:
                results.append([])
                continue
            # Transpose and calc func (mean/sum)
            try:
                # axis=0 means average across the cases for each step
                arr = np.array(lst)
                res = func(arr, axis=0).tolist()
                results.append([round(x, 2) for x in res])
            except:
                results.append([])
        return results

    avg_timings = calc_timings(pareto_variants['Times_List'], np.mean)
    total_timings = calc_timings(pareto_variants['Times_List'], np.sum)

    pareto_variants = pareto_variants.with_columns([
        pl.Series(avg_timings).alias('Avg_Timings'),
        pl.Series(total_timings).alias('Total_Timings')
    ]).drop('Times_List') # Drop heavy column

    # 6. Extract Top Nodes (Start/End) based on Pareto Variants
    # Convert necessary columns to Python dicts for logic compatibility
    start_counts = {}
    end_counts = {}
    
    # Iterating over the reduced Pareto set is negligible
    for row in pareto_variants.iter_rows(named=True):
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

    final_start_nodes = get_top_nodes(start_counts)
    final_end_nodes = get_top_nodes(end_counts)
    
    # Convert Variant_Path list to ensure JSON serializable if needed (Polars does this, but being safe)
    # Although to_dicts() handles it.
    
    return pareto_variants.to_dicts(), final_start_nodes, final_end_nodes

def process_data(args):
    # 1. Load Data (Lazy)
    lf = load_dataframe_lazy(args.input_path, args.format)

    # 2. Base Filters & Columns
    # Sorting in Polars is fast, but we do it logically.
    # Note: Sorting is an expensive operation, we do it once efficiently.
    lf = lf.sort(['CaseID', 'Timestamp'])

    # Window functions for Ranking and Timing
    lf = lf.with_columns([
        pl.col('Timestamp').rank('ordinal').over('CaseID').alias('Event_Rank'),
        pl.col('Timestamp').min().over('CaseID').alias('Case_Start_Time')
    ])

    lf = lf.with_columns([
        pl.col('Event_Rank').max().over('CaseID').alias('Max_Rank'),
        (pl.col('Timestamp') - pl.col('Case_Start_Time')).dt.total_seconds().alias('Seconds_From_Start')
    ])

    # Date Filters (Predicate Pushdown)
    if args.start_date:
        lf = lf.filter(pl.col('Timestamp') >= pl.lit(pd.to_datetime(args.start_date)))
    if args.end_date:
        lf = lf.filter(pl.col('Timestamp') <= pl.lit(pd.to_datetime(args.end_date)))

    # --- Branch 1: Variants Analysis ---
    # We branch off the lazy frame here. 
    # Note: In a real heavy production pipeline, we might want to materialize `lf` once here 
    # if it fits in memory to avoid re-reading/re-sorting for both branches.
    # Given 500MB, we can probably collect once.
    
    # Optimization: Collect the preprocessed base data once into memory.
    # 500MB csv -> ~1GB RAM dataframe. This is safe for most servers.
    # It speeds up subsequent ops dramatically compared to re-scanning.
    df_base = lf.collect() 

    variants_dict, start_nodes, end_nodes = get_variants_logic(df_base.lazy(), args.min_cases)

    # --- Branch 2: Edge Metrics (Graph) ---
    
    # Calculate Targets (Shift)
    # Doing this on df_base (Eager) is extremely fast in Polars (multithreaded)
    df_edges = df_base.with_columns([
        pl.col('Activity').shift(-1).over('CaseID').alias('Target_Activity'),
        pl.col('Timestamp').shift(-1).over('CaseID').alias('Target_Timestamp')
    ])

    # Filter invalid transitions
    df_edges = df_edges.filter(pl.col('Target_Activity').is_not_null())

    # Calc Duration
    df_edges = df_edges.with_columns(
        (pl.col('Target_Timestamp') - pl.col('Timestamp')).dt.total_seconds().alias('Duration_Seconds')
    )

    # Aggregation
    edge_metrics = df_edges.group_by(['Activity', 'Target_Activity']).agg([
        pl.len().alias('Case_Count'),
        pl.col('Duration_Seconds').sum().alias('Total_Duration_Seconds'),
        pl.col('Duration_Seconds').mean().alias('Mean_Duration_Seconds')
    ])

    # Edge Filters
    if args.min_cases is not None:
        edge_metrics = edge_metrics.filter(pl.col('Case_Count') >= args.min_cases)
    if args.max_cases is not None:
        edge_metrics = edge_metrics.filter(pl.col('Case_Count') <= args.max_cases)
    if args.min_mean_time is not None:
        edge_metrics = edge_metrics.filter(pl.col('Mean_Duration_Seconds') >= args.min_mean_time)
    if args.max_mean_time is not None:
        edge_metrics = edge_metrics.filter(pl.col('Mean_Duration_Seconds') <= args.max_mean_time)

    # Calculate Weights & Labels
    # Tooltips formatting
    edge_metrics = edge_metrics.with_columns([
        format_seconds_to_days_expr('Total_Duration_Seconds').alias('Tooltip_Total_Time'),
        format_seconds_to_days_expr('Mean_Duration_Seconds').alias('Tooltip_Mean_Time')
    ])

    # Weight Logic
    if args.weight_metric == 'mean_time':
        divisor_map = {'s': 1, 'm': 60, 'h': 3600, 'd': 86400, 'w': 604800}
        divisor = divisor_map.get(args.time_unit, 1)
        unit_label_map = {'s': 'ثانیه', 'm': 'دقیقه', 'h': 'ساعت', 'd': 'روز', 'w': 'هفته'}
        unit_label = unit_label_map.get(args.time_unit, 's')

        edge_metrics = edge_metrics.with_columns([
            (pl.col('Mean_Duration_Seconds') / divisor).alias('Weight_Value'),
            (pl.col('Mean_Duration_Seconds') / divisor).round(2).cast(pl.Utf8).add(f" {unit_label}").alias('Edge_Label')
        ])
    else:
        edge_metrics = edge_metrics.with_columns([
            pl.col('Case_Count').alias('Weight_Value'),
            pl.col('Case_Count').cast(pl.Int64).cast(pl.Utf8).alias('Edge_Label')
        ])

    # Rename for output match
    edge_metrics = edge_metrics.rename({
        'Activity': 'Source_Activity'
    })

    # Select Final Columns
    final_df = edge_metrics.select([
        'Source_Activity', 
        'Target_Activity', 
        'Mean_Duration_Seconds',
        'Tooltip_Total_Time', 
        'Tooltip_Mean_Time',
        'Weight_Value', 
        'Edge_Label' 
    ])

    return final_df.to_dicts(), variants_dict, start_nodes, end_nodes

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process data and generate a layouted graph JSON (Polars Version).")
    parser.add_argument('--format', type=str, required=True, choices=['csv', 'pkl', 'parquet'])
    parser.add_argument('--input-path', type=str, required=True)
    parser.add_argument('--start-date', type=str, required=False)
    parser.add_argument('--end-date', type=str, required=False)
    parser.add_argument('--min-cases', type=int, required=False)
    parser.add_argument('--max-cases', type=int, required=False)
    parser.add_argument('--min-mean-time', type=int, required=False, help="Minimum mean time in seconds")
    parser.add_argument('--max-mean-time', type=int, required=False, help="Maximum mean time in seconds")
    parser.add_argument('--weight-metric', type=str, required=False, default='cases', choices=['cases', 'mean_time'])
    parser.add_argument('--time-unit', type=str, required=False, default='d', choices=['s', 'm', 'h', 'd', 'w'])
    args = parser.parse_args()

    if sys.stdout.encoding != 'UTF-8':
        sys.stdout.reconfigure(encoding='utf-8')

    try:
        final_output, variants_data, start_nodes, end_nodes = process_data(args)
        
        print(json.dumps({
            "graphData": final_output,
            "variants" : variants_data,
            "startActivities": start_nodes, 
            "endActivities": end_nodes
        }, ensure_ascii=False))
        
    except Exception as e:
        # It's good practice to print traceback for debugging in dev
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)