import type { Path } from "src/types/types";
import type { Edge } from "@xyflow/react";

// ++++++ تابع کمکی برای BFS (بدون تغییر) ++++++
const getReachableNodes = (
  startNode: string,
  adjMap: Map<string, { target: string; id: string }[]>
) => {
  const reachable = new Set<string>();
  const queue = [startNode];
  reachable.add(startNode);
  while (queue.length > 0) {
    const node = queue.shift()!;
    const neighbors = adjMap.get(node) || [];
    for (const edge of neighbors) {
      if (!reachable.has(edge.target)) {
        reachable.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  return reachable;
};

self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case "FIND_ALL_PATHS": {
      console.log("Pathfinding Worker: Received job.");
      const { allEdges, startNodeId, endNodeId } = payload;

      const MAX_PATHS_TO_FIND = 100000;
      const MAX_PATH_LENGTH = 30; // حداکثر عمق جستجو

      // +++++ گام ۱ تا ۵: Pruning (هرس کردن) (بدون تغییر) +++++
      const adj = new Map<string, { target: string; id: string }[]>();
      const reverseAdj = new Map<string, { target: string; id: string }[]>();

      for (const edge of allEdges as Edge[]) {
        if (!adj.has(edge.source)) {
          adj.set(edge.source, []);
        }
        adj.get(edge.source)!.push({ target: edge.target, id: edge.id });

        if (!reverseAdj.has(edge.target)) {
          reverseAdj.set(edge.target, []);
        }
        reverseAdj.get(edge.target)!.push({ target: edge.source, id: edge.id });
      }

      const reachableFromStart = getReachableNodes(startNodeId, adj);
      const reachableToEnd = getReachableNodes(endNodeId, reverseAdj);

      const usefulNodes = new Set<string>(
        [...reachableFromStart].filter((node) => reachableToEnd.has(node))
      );

      if (!usefulNodes.has(startNodeId) || !usefulNodes.has(endNodeId)) {
        console.log("No path possible after pruning.");
        self.postMessage({ type: "PATHS_FOUND", payload: [] });
        break;
      }

      console.log(`Pruning complete. Useful nodes: ${usefulNodes.size}`);

      const prunedAdj = new Map<string, { target: string; id: string }[]>();
      for (const [node, edges] of adj.entries()) {
        if (usefulNodes.has(node)) {
          const usefulEdges = edges.filter((edge) =>
            usefulNodes.has(edge.target)
          );
          if (usefulEdges.length > 0) {
            prunedAdj.set(node, usefulEdges);
          }
        }
      }

      // ++++++ گام ۶: اجرای DFS بازگشتی با Backtracking (پیاده‌سازی نکات ۱ و ۲) ++++++

      const allPaths: Path[] = [];

      // متغیرهایی که در تمام فراخوانی‌های بازگشتی مشترک هستند
      const currentPathNodes: string[] = []; // (نکته ۱)
      const currentPathEdges: string[] = []; // (نکته ۱)
      const visitedInPath = new Set<string>(); // (نکته ۲)

      /**
       * تابع بازگشتی DFS برای پیدا کردن مسیرها
       */
      const dfs = (currentNodeId: string, currentDepth: number) => {
        // --- ۱. علامت‌گذاری حالت فعلی (Push / Add) ---
        currentPathNodes.push(currentNodeId); // (نکته ۱)
        visitedInPath.add(currentNodeId); // (نکته ۲)

        // --- ۲. بررسی شرط رسیدن به مقصد ---
        if (currentNodeId === endNodeId) {
          // یک مسیر پیدا شد! یک کپی از آن را ذخیره کن
          allPaths.push({
            nodes: [...currentPathNodes], // کپی در زمان یافتن مسیر
            edges: [...currentPathEdges], // کپی در زمان یافتن مسیر
          });

          // --- Backtrack قبل از بازگشت ---
          // گره فعلی را از مسیر حذف کن تا شاخه‌های دیگر بررسی شوند
          visitedInPath.delete(currentNodeId);
          currentPathNodes.pop();
          return; // از این شاخه ادامه نده
        }

        // --- ۳. بررسی شروط توقف ---
        // اگر به سقف مسیرها یا عمق مجاز رسیدیم، جستجو در این شاخه را متوقف کن
        if (
          allPaths.length >= MAX_PATHS_TO_FIND ||
          currentDepth >= MAX_PATH_LENGTH
        ) {
          // --- Backtrack قبل از بازگشت ---
          visitedInPath.delete(currentNodeId);
          currentPathNodes.pop();
          return;
        }

        // --- ۴. جستجو در همسایه‌ها ---
        const neighbors = prunedAdj.get(currentNodeId) || [];
        for (const edge of neighbors) {
          const neighborId = edge.target;

          // بررسی چرخه با هزینه (O(1 (نکته ۲)
          if (!visitedInPath.has(neighborId)) {
            // یال را به مسیر اضافه کن (نکته ۱)
            currentPathEdges.push(edge.id);

            // فراخوانی بازگشتی
            dfs(neighborId, currentDepth + 1);

            // Backtrack یال (نکته ۱)
            currentPathEdges.pop();

            // اگر در حین فراخوانی بازگشتی به سقف رسیدیم، حلقه همسایه‌ها را بشکن
            if (allPaths.length >= MAX_PATHS_TO_FIND) {
              break;
            }
          }
        }

        // --- ۵. Backtrack نهایی ---
        // تمام همسایه‌های این گره بررسی شدند، آن را از مسیر حذف کن
        visitedInPath.delete(currentNodeId);
        currentPathNodes.pop();
      };

      // --- اجرای جستجو ---
      console.log("Worker: Starting recursive DFS with backtracking...");
      dfs(startNodeId, 0); // جستجو را از گره شروع و عمق صفر آغاز کن

      self.postMessage({
        type: "PATHS_FOUND",
        payload: allPaths,
      });
      console.log(`Pathfinding Worker: Found ${allPaths.length} paths.`);
      break;
    }
  }
};
