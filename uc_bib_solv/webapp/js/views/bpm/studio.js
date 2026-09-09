import { createElement } from "../../core/utils.js";

/**
 * Mount the isolated industrial editor as a first-class webapp route.
 * The iframe prevents the studio's dense, canvas-specific design system from
 * leaking into the operational shell while sharing the same origin and BPM API.
 */
export function renderProcessStudio() {
  const hashQuery = window.location.hash.split("?")[1] || "";
  const sourceParams = new URLSearchParams(hashQuery);
  const frameParams = new URLSearchParams({ embedded: "1" });
  const processId = sourceParams.get("processId") || sourceParams.get("process_id") || sourceParams.get("bpm_process_id");
  const nodeId = sourceParams.get("selectedNodeId") || sourceParams.get("node_id");
  if (processId) frameParams.set("processId", processId);
  if (nodeId) frameParams.set("selectedNodeId", nodeId);
  if (sourceParams.get("trail")) frameParams.set("trail", sourceParams.get("trail"));
  if (sourceParams.get("new") === "1") frameParams.set("new", "1");
  const main = createElement("main", {
    className: "bpm-studio-route",
    attrs: { "aria-label": "Industrial Flow Studio" },
  });
  const frame = createElement("iframe", {
    className: "bpm-studio-frame",
    attrs: {
      src: `./bpm-studio.html?${frameParams.toString()}`,
      title: "Editor visual de procesos industriales",
      loading: "eager",
    },
  });
  main.append(frame);
  return { main };
}
