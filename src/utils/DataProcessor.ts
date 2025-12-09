import pl from 'nodejs-polars';
import { program } from 'commander';

// --- Types & Interfaces ---

interface CliOptions {
    format: 'csv' | 'parquet';
    inputPath: string;
    startDate?: string;
    endDate?: string;
    minCases?: string; // Commander passes numbers as strings initially usually, parsed later
    maxCases?: string;
    minMeanTime?: string;
    maxMeanTime?: string;
    weightMetric: 'cases' | 'mean_time';
    timeUnit: 's' | 'm' | 'h' | 'd' | 'w';
}

interface EdgeMetricRow {
    Source_Activity: string | null;
    Target_Activity: string | null;
    Mean_Duration_Seconds: number;
    Tooltip_Total_Time: string;
    Tooltip_Mean_Time: string;
    Weight_Value: number;
    Edge_Label: string;
}

interface VariantRow {
    Variant_Path: string[];
    Frequency: number;
    Percentage: number;
    Avg_Timings: number[];
    Total_Timings: number[];
    True_Start_Count: number;
    True_End_Count: number;
}

interface ProcessedOutput {
    graphData: EdgeMetricRow[];
    variants: VariantRow[];
    startActivities: string[];
    endActivities: string[];
}

// --- Helper Functions ---

/**
 * Creates a Polars expression to format seconds into "X روز" string.
 * Node-Polars string formatting is slightly different than Python's.
 */
function formatSecondsToDaysExpr(colName: string): pl.Expr {
    const days = pl.col(colName).div(86400);
    
    // pl.format is not fully available in nodejs-polars in the same way,
    // so we construct the string using concat.
    return pl.when(pl.col(colName).eq(0))
        .then(pl.lit("0s"))
        .when(pl.col(colName).isNull())
        .then(pl.lit(""))
        .otherwise(
            pl.concatString([
                days.round(2).cast(pl.Utf8),
                pl.lit(" روز ")
            ])
        );
}

/**
 * Loads the dataframe lazily.
 */
function loadDataframeLazy(filePath: string, formatType: 'csv' | 'parquet'): pl.LazyDataFrame {
    let q: pl.LazyDataFrame;

    if (formatType === 'csv') {
        // tryParseDates is strictly typed in Node
        q = pl.scanCSV(filePath, { tryParseDates: true });
    } else if (formatType === 'parquet') {
        q = pl.scanParquet(filePath);
    } else {
        throw new Error("Format not supported. Only 'csv' and 'parquet' are allowed in Node.js version.");
    }

    // Since we can't easily peek schema in Lazy mode without fetching, 
    // we assume standard columns or rely on user providing correct headers.
    // However, to mimic Python logic of renaming by index, we might need to fetch schema (cheap).
    // In Node Polars Lazy, renaming by index blindly is risky. 
    // We proceed assuming headers exist or match logic.
    
    // Let's ensure Timestamp is datetime
    // Note: Node-Polars relies on strings for col selection usually
    return q.withColumns(
        pl.col("Timestamp").cast(pl.Datetime("us")) // Microseconds standard
    );
}

/**
 * Replicates Numpy's column-wise operation (mean/sum) on a list of lists.
 */
function calculateListStats(
    listOfLists: number[][], 
    op: 'mean' | 'sum'
): number[] {
    if (!listOfLists || listOfLists.length === 0) return [];
    
    // Find max length (though usually variant paths have uniform length per variant group)
    let maxLen = 0;
    for(const l of listOfLists) {
        if(l && l.length > maxLen) maxLen = l.length;
    }
    
    const sums = new Array(maxLen).fill(0);
    const counts = new Array(maxLen).fill(0);

    for (const list of listOfLists) {
        if (!list) continue;
        for (let i = 0; i < list.length; i++) {
            sums[i] += list[i];
            counts[i]++;
        }
    }

    return sums.map((s, i) => {
        if (op === 'sum') return parseFloat(s.toFixed(2));
        // mean
        return counts[i] === 0 ? 0 : parseFloat((s / counts[i]).toFixed(2));
    });
}

// --- Main Logic ---

async function getVariantsLogic(
    dfLazy: pl.LazyDataFrame, 
    minCases?: number
): Promise<[VariantRow[], string[], string[]]> {
    
    // 1. Aggregate per Case
    // Node-Polars casting: (bool expr).cast(pl.Int32)
    const casesAgg = dfLazy.groupBy("CaseID").agg(
        pl.col("Activity").alias("Variant_Path"),
        pl.col("Seconds_From_Start").alias("Times_List"),
        pl.col("Event_Rank").first().eq(1).cast(pl.Int32).alias("Is_True_Start"),
        pl.col("Event_Rank").last().eq(pl.col("Max_Rank").first()).cast(pl.Int32).alias("Is_True_End")
    );

    // 2. Group by Variant_Path
    let variantsAgg = casesAgg.groupBy("Variant_Path").agg(
        pl.len().alias("Frequency"),
        pl.col("Times_List"), // List of lists
        pl.col("Is_True_Start").sum().alias("True_Start_Count"),
        pl.col("Is_True_End").sum().alias("True_End_Count")
    );

    // 3. Filter min_cases
    if (minCases !== undefined) {
        variantsAgg = variantsAgg.filter(pl.col("Frequency").greaterThanEquals(minCases));
    }

    // Trigger calculation
    let variantsDf = await variantsAgg.collect();

    if (variantsDf.height === 0) {
        return [[], [], []];
    }

    // 4. Pareto Logic
    const totalCases = variantsDf.getColumn("Frequency").sum();
    
    variantsDf = variantsDf.withColumns(
        pl.col("Frequency").div(totalCases).mul(100).alias("Percentage")
    ).sort("Frequency", true); // descending = true

    variantsDf = variantsDf.withColumns(
        pl.col("Percentage").cumSum().div(100).alias("cum_coverage")
    );

    // Filter 95%
    const targetCoverage = 0.95;
    const cutoffDf = variantsDf.filter(pl.col("cum_coverage").greaterThanEquals(targetCoverage)).head(1);
    
    let paretoVariants = variantsDf;
    if (cutoffDf.height > 0) {
        // Extract scalar value from the first row of cum_coverage
        const limitVal = cutoffDf.getColumn("cum_coverage").get(0) as number;
        paretoVariants = variantsDf.filter(pl.col("cum_coverage").lessThanEquals(limitVal));
    }

    // 5. Calculate Avg/Total Timings (Numpy replacement)
    // We convert the 'Times_List' column to a JS array of arrays to process manually
    const timesListSeries = paretoVariants.getColumn("Times_List");
    // .toJs() returns (number[] | null)[]
    const timesRows = timesListSeries.toArray() as number[][][];

    const avgTimings: number[][] = [];
    const totalTimings: number[][] = [];

    for (const rowVal of timesRows) {
        // rowVal is number[][] or null
        if (!rowVal) {
            avgTimings.push([]);
            totalTimings.push([]);
            continue;
        }
        avgTimings.push(calculateListStats(rowVal, 'mean'));
        totalTimings.push(calculateListStats(rowVal, 'sum'));
    }

    // Add calculations back to DF is tricky with complex lists in Node-Polars,
    // so we will attach them when converting to Dict (Object).
    // Let's construct the VariantRow objects manually now.
    
    const paretoIter = paretoVariants.toRecords() as any[];
    const finalVariants: VariantRow[] = paretoIter.map((row, idx) => ({
        Variant_Path: row.Variant_Path,
        Frequency: row.Frequency,
        Percentage: row.Percentage,
        True_Start_Count: row.True_Start_Count,
        True_End_Count: row.True_End_Count,
        Avg_Timings: avgTimings[idx],
        Total_Timings: totalTimings[idx]
    }));

    // 6. Top Nodes Logic
    const startCounts: Record<string, number> = {};
    const endCounts: Record<string, number> = {};

    for (const row of finalVariants) {
        const path = row.Variant_Path;
        if (path && path.length > 0) {
            const sNode = path[0];
            const eNode = path[path.length - 1];
            
            if (row.True_Start_Count > 0) {
                startCounts[sNode] = (startCounts[sNode] || 0) + row.True_Start_Count;
            }
            if (row.True_End_Count > 0) {
                endCounts[eNode] = (endCounts[eNode] || 0) + row.True_End_Count;
            }
        }
    }

    const getTopNodes = (countsDict: Record<string, number>, threshold = 0.90): string[] => {
        const sortedEntries = Object.entries(countsDict).sort((a, b) => b[1] - a[1]);
        const total = Object.values(countsDict).reduce((a, b) => a + b, 0);
        
        if (total === 0) return [];

        let currentSum = 0;
        const selected: string[] = [];
        
        for (const [node, count] of sortedEntries) {
            currentSum += count;
            selected.push(node);
            if ((currentSum / total) >= threshold) break;
        }
        
        // Safety fallback
        if (selected.length === 0 && sortedEntries.length > 0) {
            selected.push(sortedEntries[0][0]);
        }
        return selected;
    };

    return [finalVariants, getTopNodes(startCounts), getTopNodes(endCounts)];
}

async function processData(options: CliOptions): Promise<ProcessedOutput> {
    // 1. Load
    let lf = loadDataframeLazy(options.inputPath, options.format);

    // Standardize column names if needed. 
    // Here we assume Input has CaseID, Activity, Timestamp or rename explicitly if known.
    // For general purpose, we try to rename index-based if schema check was easy, 
    // but here we will force rename via mapping if user assumes 3 columns.
    // We'll skip the blind rename to keep it safe, assuming CSV headers are correct 
    // OR user maps them in ETL. 
    // We DO need to ensure we use specific names for logic.
    // NOTE: In strict TS, rename expects existing keys. 
    // We assume the input file has headers: 'CaseID', 'Activity', 'Timestamp'
    
    // 2. Base columns
    lf = lf.sort(["CaseID", "Timestamp"]);

    lf = lf.withColumns(
        pl.col("Timestamp").rank("ordinal").over("CaseID").alias("Event_Rank"),
        pl.col("Timestamp").min().over("CaseID").alias("Case_Start_Time")
    );

    lf = lf.withColumns(
        pl.col("Event_Rank").max().over("CaseID").alias("Max_Rank"),
        pl.col("Timestamp").sub(pl.col("Case_Start_Time")).cast(pl.Duration("ms")).alias("Duration_Struct")
    );
    
    // Seconds from start (Node polars duration handling)
    // We convert duration to milliseconds then divide by 1000
    lf = lf.withColumns(
        pl.col("Duration_Struct").dt.totalMilliseconds().div(1000).alias("Seconds_From_Start")
    );

    // Filter Dates
    if (options.startDate) {
        lf = lf.filter(pl.col("Timestamp").greaterThanEquals(pl.lit(new Date(options.startDate))));
    }
    if (options.endDate) {
        lf = lf.filter(pl.col("Timestamp").lessThanEquals(pl.lit(new Date(options.endDate))));
    }

    // Materialize base DF
    const dfBase = await lf.collect();

    // --- Branch 1: Variants ---
    const minCasesNum = options.minCases ? parseInt(options.minCases) : undefined;
    const [variantsData, startNodes, endNodes] = await getVariantsLogic(dfBase.lazy(), minCasesNum);

    // --- Branch 2: Edges ---
    // Shift and Calc Targets
    let dfEdges = dfBase.withColumns(
        pl.col("Activity").shift(-1).over("CaseID").alias("Target_Activity"),
        pl.col("Timestamp").shift(-1).over("CaseID").alias("Target_Timestamp")
    );

    dfEdges = dfEdges.filter(pl.col("Target_Activity").isNotNull());

    // Duration
    dfEdges = dfEdges.withColumns(
        pl.col("Target_Timestamp").sub(pl.col("Timestamp"))
            .dt.totalMilliseconds().div(1000).alias("Duration_Seconds")
    );

    // Aggregation
    let edgeMetrics = dfEdges.groupBy(["Activity", "Target_Activity"]).agg(
        pl.len().alias("Case_Count"),
        pl.col("Duration_Seconds").sum().alias("Total_Duration_Seconds"),
        pl.col("Duration_Seconds").mean().alias("Mean_Duration_Seconds")
    );

    // Edge Filters
    if (options.minCases) edgeMetrics = edgeMetrics.filter(pl.col("Case_Count").greaterThanEquals(parseInt(options.minCases)));
    if (options.maxCases) edgeMetrics = edgeMetrics.filter(pl.col("Case_Count").lessThanEquals(parseInt(options.maxCases)));
    if (options.minMeanTime) edgeMetrics = edgeMetrics.filter(pl.col("Mean_Duration_Seconds").greaterThanEquals(parseInt(options.minMeanTime)));
    if (options.maxMeanTime) edgeMetrics = edgeMetrics.filter(pl.col("Mean_Duration_Seconds").lessThanEquals(parseInt(options.maxMeanTime)));

    // Tooltips
    edgeMetrics = edgeMetrics.withColumns(
        formatSecondsToDaysExpr("Total_Duration_Seconds").alias("Tooltip_Total_Time"),
        formatSecondsToDaysExpr("Mean_Duration_Seconds").alias("Tooltip_Mean_Time")
    );

    // Weights & Labels
    const divisorMap: Record<string, number> = { 's': 1, 'm': 60, 'h': 3600, 'd': 86400, 'w': 604800 };
    const unitLabelMap: Record<string, string> = { 's': 'ثانیه', 'm': 'دقیقه', 'h': 'ساعت', 'd': 'روز', 'w': 'هفته' };
    
    const divisor = divisorMap[options.timeUnit] || 1;
    const unitLabel = unitLabelMap[options.timeUnit] || 's';

    if (options.weightMetric === 'mean_time') {
        edgeMetrics = edgeMetrics.withColumns(
            pl.col("Mean_Duration_Seconds").div(divisor).alias("Weight_Value"),
            pl.concatString([
                pl.col("Mean_Duration_Seconds").div(divisor).round(2).cast(pl.Utf8),
                pl.lit(` ${unitLabel}`)
            ]).alias("Edge_Label")
        );
    } else {
        edgeMetrics = edgeMetrics.withColumns(
            pl.col("Case_Count").alias("Weight_Value"),
            pl.col("Case_Count").cast(pl.Int64).cast(pl.Utf8).alias("Edge_Label")
        );
    }

    edgeMetrics = edgeMetrics.rename({ "Activity": "Source_Activity" });

    const finalDf = edgeMetrics.select(
        "Source_Activity",
        "Target_Activity",
        "Mean_Duration_Seconds",
        "Tooltip_Total_Time",
        "Tooltip_Mean_Time",
        "Weight_Value",
        "Edge_Label"
    );

    // Convert to strict Type
    const graphData = finalDf.toRecords() as unknown as EdgeMetricRow[];

    return {
        graphData,
        variants: variantsData,
        startActivities: startNodes,
        endActivities: endNodes
    };
}

// --- CLI Entry Point ---

program
    .requiredOption('--format <type>', 'File format (csv, parquet)')
    .requiredOption('--input-path <path>', 'Input file path')
    .option('--start-date <date>', 'Start date YYYY-MM-DD')
    .option('--end-date <date>', 'End date YYYY-MM-DD')
    .option('--min-cases <number>', 'Minimum cases')
    .option('--max-cases <number>', 'Maximum cases')
    .option('--min-mean-time <number>', 'Minimum mean time seconds')
    .option('--max-mean-time <number>', 'Maximum mean time seconds')
    .option('--weight-metric <type>', 'Weight metric (cases, mean_time)', 'cases')
    .option('--time-unit <unit>', 'Time unit (s, m, h, d, w)', 'd')
    .action(async (options: CliOptions) => {
        try {
            const result = await processData(options);
            console.log(JSON.stringify(result, null, 2)); // formatted json or minified based on needs
        } catch (error) {
            console.error("Error processing data:", error);
            process.exit(1);
        }
    });

program.parse(process.argv);