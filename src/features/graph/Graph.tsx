import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useGraphStore,
  type GraphData,
  type GraphNode,
  type Edge,
  type PersonNode,
  type AchievementNode,
} from "./store";

const getSourceId = (d: Edge | d3.SimulationLinkDatum<GraphNode>): string =>
  typeof d.source === "string" ? d.source : (d.source as GraphNode).id;

const getTargetId = (d: Edge | d3.SimulationLinkDatum<GraphNode>): string =>
  typeof d.target === "string" ? d.target : (d.target as GraphNode).id;

const TimelineGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const {
    setData: setCacheData,
    focusedPersonId,
    setFocusedPerson,
    setSelectedFields,
    selectedFields,
  } = useGraphStore();

  const simulationRef = useRef<d3.Simulation<
    GraphNode,
    d3.SimulationLinkDatum<GraphNode>
  > | null>(null);
  const linkRef = useRef<d3.Selection<
    SVGPathElement,
    d3.SimulationLinkDatum<GraphNode>,
    SVGGElement,
    unknown
  > | null>(null);
  const nodeRef = useRef<d3.Selection<
    SVGGElement,
    GraphNode,
    SVGGElement,
    unknown
  > | null>(null);
  const gRef = useRef<d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const transformRef = useRef(d3.zoomIdentity);
  const yearScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null);
  const xAxisGroupRef = useRef<d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>(null);

  useEffect(() => {
    fetch("/graph-data.json")
      .then((response) => response.json())
      .then((fetchedData: GraphData) => {
        setData(fetchedData);
        setCacheData(fetchedData);
        const fieldsSet = new Set<string>();
        fetchedData.persons.forEach((person) => {
          const fields = person.field.split(",").map((f) => f.trim());
          fields.forEach((field) => fieldsSet.add(field));
        });
        setSelectedFields(Array.from(fieldsSet));
      });
  }, [setCacheData, setSelectedFields]);

  const filteredData = useMemo(() => {
    if (!data) return null;
    if (selectedFields.length === 0) {
      return { nodes: [], persons: [], edges: [] };
    }
    const filteredPersons = data.persons.filter((person) => {
      const personFields = person.field.split(",").map((f) => f.trim());
      return personFields.some((field) => selectedFields.includes(field));
    });
    const filteredPersonIds = new Set(filteredPersons.map((p) => p.id));
    const filteredEdges = data.edges.filter(
      (edge) =>
        filteredPersonIds.has(getSourceId(edge)) ||
        filteredPersonIds.has(getTargetId(edge))
    );
    const connectedAchievementIds = new Set<string>();
    filteredEdges.forEach((edge) => {
      const sourceId = getSourceId(edge);
      const targetId = getTargetId(edge);
      if (!filteredPersonIds.has(sourceId))
        connectedAchievementIds.add(sourceId);
      if (!filteredPersonIds.has(targetId))
        connectedAchievementIds.add(targetId);
    });
    const filteredAchievements = data.nodes.filter((node) =>
      connectedAchievementIds.has(node.id)
    );
    const finalNodeIds = new Set([
      ...filteredPersonIds,
      ...connectedAchievementIds,
    ]);
    const finalEdges = data.edges.filter(
      (edge) =>
        finalNodeIds.has(getSourceId(edge)) &&
        finalNodeIds.has(getTargetId(edge))
    );
    return {
      nodes: filteredAchievements,
      persons: filteredPersons,
      edges: finalEdges,
    };
  }, [data, selectedFields]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = containerRef.current.getBoundingClientRect();

    gRef.current = svg.append("g");
    svg.append("defs");

    const startYear = 1650;
    const yearDomain = [startYear, startYear + window.innerWidth / 18];
    const padding = 80;
    yearScaleRef.current = d3
      .scaleLinear()
      .domain(yearDomain)
      .range([padding, width - padding]);

    simulationRef.current = d3
      .forceSimulation<GraphNode>()
      .force(
        "link",
        d3
          .forceLink<GraphNode, d3.SimulationLinkDatum<GraphNode>>()
          .id((d) => d.id)
          .strength(0.1)
      )
      .force("charge", d3.forceManyBody().strength(-100))
      .force(
        "y",
        d3
          .forceY<GraphNode>((d) =>
            d.type === "person" ? height * 0.35 : height * 0.65
          )
          .strength(0.1)
      )
      .force("collide", d3.forceCollide().radius(75));

    linkRef.current = gRef.current
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("fill", "none")
      .selectAll<SVGPathElement, d3.SimulationLinkDatum<GraphNode>>("path");

    nodeRef.current = gRef.current
      .append("g")
      .selectAll<SVGGElement, GraphNode>("g");

    simulationRef.current.on("tick", () => {
      linkRef.current?.attr("d", (d) => {
        const source = d.source as GraphNode;
        const target = d.target as GraphNode;
        if (!source.x || !source.y || !target.x || !target.y) return null;
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        const controlPointY = source.y < target.y ? midY + 40 : midY - 40;
        const path = d3.path();
        path.moveTo(source.x, source.y);
        path.quadraticCurveTo(midX, controlPointY, target.x, target.y);
        return path.toString();
      });
      nodeRef.current?.attr("transform", (d) =>
        d.x && d.y ? `translate(${d.x}, ${d.y})` : null
      );
    });

    const formatYear = (d: d3.AxisDomain) => {
      const year = d as number;
      return year < 0
        ? `${Math.abs(Math.round(year))} BC`
        : `${Math.round(year)}`;
    };

    xAxisGroupRef.current = svg
      .append("g")
      .attr("transform", `translate(0, ${height - 30})`);

    const updateXAxis = (transform: d3.ZoomTransform) => {
      if (!yearScaleRef.current || !xAxisGroupRef.current) return;
      const newYearScale = transform.rescaleX(yearScaleRef.current);
      const xAxis = d3.axisBottom(newYearScale).tickFormat(formatYear);
      xAxisGroupRef.current.call(xAxis);
      xAxisGroupRef.current.selectAll("text").attr("fill", "#333");
    };

    updateXAxis(transformRef.current);

    zoomRef.current = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        gRef.current?.attr("transform", event.transform.toString());
        updateXAxis(event.transform);
        gRef.current
          ?.selectAll("text")
          .style("opacity", event.transform.k < 0.5 ? 0 : 1);
      });

    svg.call(zoomRef.current.transform, transformRef.current);
    svg.call(zoomRef.current);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (!simulationRef.current) continue;
        const { width, height } = entry.contentRect;
        yearScaleRef.current?.range([padding, width - padding]);
        simulationRef.current.force(
          "y",
          d3
            .forceY<GraphNode>((d) =>
              d.type === "person" ? height * 0.35 : height * 0.65
            )
            .strength(0.1)
        );
        xAxisGroupRef.current?.attr(
          "transform",
          `translate(0, ${height - 30})`
        );
        updateXAxis(transformRef.current);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (
      !filteredData ||
      !simulationRef.current ||
      !nodeRef.current ||
      !linkRef.current ||
      !yearScaleRef.current
    )
      return;

    const { nodes: achievementNodes, persons, edges } = filteredData;
    const allNodes: GraphNode[] = [...persons, ...achievementNodes];
    const allEdges = edges as d3.SimulationLinkDatum<GraphNode>[];

    allNodes.forEach((node) => {
      if (node.x === undefined && yearScaleRef.current) {
        if (node.type === "achievement")
          node.fx = yearScaleRef.current(node.year);
        else if (node.type === "person")
          node.fx = yearScaleRef.current(node.birth);
      }
    });

    const defs = d3.select(svgRef.current).select("defs");
    persons.forEach((person) => {
      if (person.photo_url && defs.select(`#pattern-${person.id}`).empty()) {
        defs
          .append("pattern")
          .attr("id", `pattern-${person.id}`)
          .attr("width", 1)
          .attr("height", 1)
          .append("image")
          .attr("href", person.photo_url)
          .attr("width", 24)
          .attr("height", 24);
      }
    });

    simulationRef.current.nodes(allNodes);
    simulationRef.current
      .force<d3.ForceLink<GraphNode, d3.SimulationLinkDatum<GraphNode>>>("link")
      ?.links(allEdges);

    nodeRef.current = nodeRef.current
      .data(allNodes, (d) => d.id)
      .join(
        (enter) => {
          const nodeGroup = enter
            .append("g")
            .style("cursor", "pointer")
            .on("click", (_, d) => setSelectedNode(d))
            .on("mouseenter", (_, d) => {
              nodeRef.current?.style("opacity", (n) => {
                const isConnected = allEdges.some(
                  (e) =>
                    (getSourceId(e) === d.id && getTargetId(e) === n.id) ||
                    (getTargetId(e) === d.id && getSourceId(e) === n.id)
                );
                return isConnected || n.id === d.id ? 1 : 0.3;
              });
              linkRef.current?.style("stroke-opacity", (e) =>
                getSourceId(e) === d.id || getTargetId(e) === d.id ? 1 : 0.3
              );

              linkRef.current
                ?.attr("stroke", (e) => {
                  const sourceId =
                    typeof e.source === "object"
                      ? (e.source as GraphNode).id
                      : e.source;

                  const targetId =
                    typeof e.target === "object"
                      ? (e.target as GraphNode).id
                      : e.target;

                  return sourceId === d.id || targetId === d.id
                    ? "#1271ff"
                    : "#999";
                })

                .attr("stroke-width", (e) => {
                  const sourceId =
                    typeof e.source === "object"
                      ? (e.source as GraphNode).id
                      : e.source;

                  const targetId =
                    typeof e.target === "object"
                      ? (e.target as GraphNode).id
                      : e.target;

                  return sourceId === d.id || targetId === d.id ? 3 : 1.5;
                });
            })
            .on("mouseleave", () => {
              nodeRef.current?.style("opacity", 1);
              linkRef.current?.style("stroke-opacity", 0.6);
              linkRef.current
                ?.attr("stroke", (e) => {
                  return "#999";
                })
                .attr("stroke-width", (e) => {
                  return 1.5;
                });
            });

          nodeGroup
            .filter((d) => d.type === "person")
            .append("circle")
            .attr("r", 12)
            .attr("fill", (d) =>
              (d as PersonNode).photo_url ? `url(#pattern-${d.id})` : "#1f77b4"
            )
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5);

          nodeGroup
            .filter((d) => d.type === "achievement")
            .append("rect")
            .attr("width", 18)
            .attr("height", 18)
            .attr("rx", 2)
            .attr("ry", 2)
            .attr("fill", "#ff7f0e")
            .attr("x", -9)
            .attr("y", -9);

          nodeGroup
            .append("text")
            .text((d) =>
              d.type === "person"
                ? (d as PersonNode).name
                : (d as AchievementNode).title
            )
            .attr("x", 18)
            .attr("y", 5)
            .attr("font-size", "12px")
            .attr("fill", "#333")
            .style("opacity", transformRef.current.k < 0.5 ? 0 : 1);

          return nodeGroup;
        },
        (update) => update,
        (exit) => exit.remove()
      );

    linkRef.current = linkRef.current
      .data(allEdges, (d) => `${getSourceId(d)}-${getTargetId(d)}`)
      .join(
        (enter) => enter.append("path").attr("stroke-width", 1.5),
        (update) => update,
        (exit) => exit.remove()
      );

    simulationRef.current.alpha(0.3).restart();
  }, [filteredData]);

  useEffect(() => {
    if (
      !focusedPersonId ||
      !filteredData ||
      !svgRef.current ||
      !zoomRef.current ||
      !nodeRef.current ||
      !containerRef.current
    )
      return;

    const { nodes: achievementNodes, persons } = filteredData;
    const allNodes: GraphNode[] = [...persons, ...achievementNodes];
    const targetNode = allNodes.find((n) => n.id === focusedPersonId);

    if (targetNode) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const x = targetNode.fx!;
      const y = targetNode.y!;
      const targetZoom = 1.5;

      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(targetZoom)
        .translate(-x, -y);

      const focusedNodeElement = nodeRef.current.filter(
        (d) => d.id === focusedPersonId
      );
      if (!focusedNodeElement.empty()) {
        const glowElement = focusedNodeElement
          .insert(
            targetNode.type === "person" ? "circle" : "rect",
            ":first-child"
          )
          .attr("class", "highlight-glow")
          .attr("stroke", "#1aeb36")
          .attr("stroke-width", 2)
          .attr("fill", "#1aeb36")
          .attr("fill-opacity", 0.3);

        if (targetNode.type === "person") {
          glowElement.attr("r", 16);
        } else {
          glowElement
            .attr("width", 24)
            .attr("height", 24)
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("x", -12)
            .attr("y", -12);
        }

        const pulse = () => {
          if (glowElement.node()) {
            glowElement
              .transition()
              .duration(1500)
              .attr("stroke-width", 20)
              .attr("stroke-opacity", 0)
              .attr("fill-opacity", 0)
              .on("end", pulse);
          }
        };
        pulse();
      }

      d3.select(svgRef.current)
        .transition()
        .duration(750)
        .call(zoomRef.current.transform, transform)
        .on("end", () => {
          setTimeout(() => {
            gRef.current?.selectAll(".highlight-glow").remove();
            setFocusedPerson(null);
          }, 2000);
        });
    } else {
      setFocusedPerson(null);
    }
  }, [focusedPersonId, filteredData, setFocusedPerson]);

  const renderDialogContent = () => {
    if (!selectedNode) return null;
    if (selectedNode.type === "person") {
      const { birth, death, name, nationality, field } =
        selectedNode as PersonNode;
      const lived =
        birth < 0
          ? `Lived: ${Math.abs(birth)} BC - ${Math.abs(death)} BC`
          : `Lived: ${birth} - ${death}`;
      return (
        <>
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>
              {nationality} / {field}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">{lived}</div>
        </>
      );
    }
    if (selectedNode.type === "achievement") {
      const { year, title, category, text } = selectedNode as AchievementNode;
      const displayYear = year < 0 ? `${Math.abs(year)} BC` : year;
      return (
        <>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {category} ({displayYear})
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm">{text}</div>
        </>
      );
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={containerRef} className="flex-1" style={{ minHeight: "600px" }}>
        <svg ref={svgRef} style={{ width: "100%", height: "100%" }}></svg>
        <Dialog
          open={!!selectedNode}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedNode(null);
            }
          }}
        >
          <DialogContent>{renderDialogContent()}</DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TimelineGraph;
