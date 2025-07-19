import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useGraphStore } from "./store";

interface AchievementNode extends d3.SimulationNodeDatum {
  id: string;
  type: "achievement";
  year: number;
  title: string;
  category: string;
  text: string;
}

interface PersonNode extends d3.SimulationNodeDatum {
  id: string;
  type: "person";
  name: string;
  birth: number;
  death: number;
  field: string;
  nationality: string;
  photo_url?: string;
}

type GraphNode = AchievementNode | PersonNode;

interface Edge {
  source: string;
  target: string;
}

interface GraphData {
  nodes: AchievementNode[];
  persons: PersonNode[];
  edges: Edge[];
}

const TimelineGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const {
    setData: setCacheData,
    focusedPersonId,
    setFocusedPerson,
    setSelectedFields,
    selectedFields,
  } = useGraphStore();

  const transformRef = useRef(d3.zoomIdentity);

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
  }, [setCacheData]);

  const filteredData = useMemo(() => {
    if (!data || selectedFields.length === 0) return data;

    const filteredPersons = data.persons.filter((person) => {
      const personFields = person.field.split(",").map((f) => f.trim());
      return personFields.some((field) => selectedFields.includes(field));
    });

    const filteredPersonIds = new Set(filteredPersons.map((p) => p.id));

    const filteredEdges = data.edges.filter((edge) => {
      return (
        filteredPersonIds.has(edge.source) || filteredPersonIds.has(edge.target)
      );
    });

    const connectedAchievementIds = new Set<string>();
    filteredEdges.forEach((edge) => {
      if (!filteredPersonIds.has(edge.source)) {
        connectedAchievementIds.add(edge.source);
      }
      if (!filteredPersonIds.has(edge.target)) {
        connectedAchievementIds.add(edge.target);
      }
    });

    const filteredAchievements = data.nodes.filter((node) =>
      connectedAchievementIds.has(node.id)
    );

    const finalNodeIds = new Set([
      ...filteredPersonIds,
      ...connectedAchievementIds,
    ]);

    const finalEdges = filteredEdges.filter(
      (edge) => finalNodeIds.has(edge.source) && finalNodeIds.has(edge.target)
    );

    return {
      nodes: filteredAchievements,
      persons: filteredPersons,
      edges: finalEdges,
    };
  }, [data, selectedFields]);

  useEffect(() => {
    if (!filteredData || !svgRef.current || !containerRef.current) return;

    const { nodes: achievementNodes, persons, edges } = filteredData;
    const allNodes: GraphNode[] = [...persons, ...achievementNodes];

    const svg = d3.select(svgRef.current);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        svg.selectAll("*").remove();
        drawGraph(width, height);
      }
    });

    resizeObserver.observe(containerRef.current);

    const drawGraph = (width: number, height: number) => {
      const g = svg
        .append("g")
        .attr("transform", transformRef.current.toString());

      const defs = svg.append("defs");
      persons.forEach((person) => {
        if (person.photo_url) {
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

      const yearDomain = [1600, 1700];

      const padding = 80;
      const yearScale = d3
        .scaleLinear()
        .domain(yearDomain)
        .range([padding, width - padding]);

      allNodes.forEach((node) => {
        if (node.type === "achievement") {
          node.fx = yearScale(node.year);
        } else if (node.type === "person") {
          node.fx = yearScale(node.birth);
        }
      });

      const formatYear = (d: d3.AxisDomain) => {
        const year = d as number;
        return year < 0
          ? `${Math.abs(Math.round(year))} BC`
          : `${Math.round(year)}`;
      };

      const simulation = d3
        .forceSimulation(allNodes)
        .force(
          "link",
          d3
            .forceLink<GraphNode, Edge>(edges)
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
        .force("collide", d3.forceCollide().radius(25));

      const link = g
        .append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .attr("fill", "none")
        .selectAll<SVGPathElement, Edge>("path")
        .data(edges)
        .join("path")
        .attr("stroke-width", 1.5)
        .attr("class", "edge");

      const nodeGroup = g
        .append("g")
        .selectAll("g")
        .data(allNodes)
        .join("g")
        .style("cursor", "pointer")
        .on("click", (event, d) => setSelectedNode(d))
        .on("mouseenter", (event, d) => {
          setHoveredNodeId(d.id);

          link
            .attr("stroke", (e) => {
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
            })
            .attr("stroke-opacity", (e) => {
              const sourceId =
                typeof e.source === "object"
                  ? (e.source as GraphNode).id
                  : e.source;
              const targetId =
                typeof e.target === "object"
                  ? (e.target as GraphNode).id
                  : e.target;
              return sourceId === d.id || targetId === d.id ? 1 : 0.3;
            });

          nodeGroup.style("opacity", (n) => {
            if (n.id === d.id) return 1;

            const isConnected = edges.some((e) => {
              const sourceId =
                typeof e.source === "object"
                  ? (e.source as GraphNode).id
                  : e.source;
              const targetId =
                typeof e.target === "object"
                  ? (e.target as GraphNode).id
                  : e.target;
              return (
                (sourceId === d.id && targetId === n.id) ||
                (targetId === d.id && sourceId === n.id)
              );
            });

            return isConnected ? 1 : 0.3;
          });
        })
        .on("mouseleave", () => {
          setHoveredNodeId(null);

          link
            .attr("stroke", "#999")
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.6);

          nodeGroup.style("opacity", 1);
        });

      nodeGroup
        .filter((d) => d.type === "person")
        .append("circle")
        .attr("r", 12)
        .attr("fill", (d) =>
          (d as PersonNode).photo_url
            ? `url(#pattern-${(d as PersonNode).id})`
            : "#1f77b4"
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
        .append("title")
        .text((d) =>
          d.type === "person"
            ? (d as PersonNode).name
            : (d as AchievementNode).title
        );

      const labels = nodeGroup
        .append("text")
        .text((d) =>
          d.type === "person"
            ? (d as PersonNode).name
            : (d as AchievementNode).title
        )
        .attr("x", 18)
        .attr("y", 5)
        .attr("font-size", "12px")
        .attr("fill", "#333");

      const blurGradient = defs
        .append("linearGradient")
        .attr("id", "bottom-blur-gradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");

      blurGradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "white")
        .attr("stop-opacity", "1");

      blurGradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "white")
        .attr("stop-opacity", "0");

      svg
        .append("rect")
        .attr("x", 0)
        .attr("y", height - 60)
        .attr("width", width)
        .attr("height", 60)
        .attr("fill", "url(#bottom-blur-gradient)")
        .style("pointer-events", "none");

      const initialXAxisScale = transformRef.current.rescaleX(yearScale);
      const xAxis = d3.axisBottom(initialXAxisScale).tickFormat(formatYear);
      const xAxisGroup = svg
        .append("g")
        .attr("transform", `translate(0, ${height - 30})`)
        .style("z-index", "50")
        .call(xAxis);
      xAxisGroup.selectAll("text").attr("fill", "#333");

      simulation.on("tick", () => {
        link.attr("d", (d) => {
          const source = d.source as unknown as GraphNode;
          const target = d.target as unknown as GraphNode;
          const midX = (source.x! + target.x!) / 2;
          const midY = (source.y! + target.y!) / 2;
          const controlPointY = source.y! < target.y! ? midY + 40 : midY - 40;
          const path = d3.path();
          path.moveTo(source.x!, source.y!);
          path.quadraticCurveTo(midX, controlPointY, target.x!, target.y!);
          return path.toString();
        });
        nodeGroup.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
      });

      const zoomHandler = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 8])
        .on("zoom", (event) => {
          const { transform } = event;
          transformRef.current = transform;
          g.attr("transform", transform.toString());
          labels
            .attr("font-size", `${12 / transform.k}px`)
            .style("opacity", transform.k < 0.5 ? 0 : 1);
          const newYearScale = transform.rescaleX(yearScale);
          xAxisGroup.call(d3.axisBottom(newYearScale).tickFormat(formatYear));
          xAxisGroup.selectAll("text").attr("fill", "#333");
        });

      svg.call(zoomHandler.transform, transformRef.current);
      svg.call(zoomHandler);

      if (focusedPersonId) {
        const targetNode = allNodes.find((n) => n.id === focusedPersonId);
        if (targetNode) {
          const focusedNodeElement = nodeGroup.filter(
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
                  .duration(2000)
                  .attr("stroke-width", 6)
                  .attr("fill-opacity", 0.5)
                  .attr("stroke-opacity", 1)
                  .transition()
                  .duration(200)
                  .attr("stroke-width", 2)
                  .attr("fill-opacity", 0.3)
                  .attr("stroke-opacity", 0.5)
                  .on("end", pulse);
              }
            };
            pulse();
          }

          const x = targetNode.fx!;
          const y =
            targetNode.type === "person" ? height * 0.35 : height * 0.65;
          const targetZoom = 1.5;

          const transform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(targetZoom)
            .translate(-x, -y);

          transformRef.current = transform;

          svg
            .transition()
            .duration(750)
            .call(zoomHandler.transform, transform)
            .on("end", () => {
              g.selectAll(".highlight-glow")
                .transition()
                .duration(3000)
                .attr("stroke-opacity", 0)
                .attr("fill-opacity", 0)
                .remove();

              setTimeout(() => {
                setFocusedPerson(null);
              }, 3000);
            });
        } else {
          setFocusedPerson(null);
        }
      }
    };

    const initialWidth = containerRef.current.clientWidth;
    const initialHeight = containerRef.current.clientHeight;
    if (initialWidth > 0) {
      drawGraph(initialWidth, initialHeight);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [filteredData, focusedPersonId, setFocusedPerson]);

  const renderDialogContent = () => {
    if (!selectedNode) return null;
    if (selectedNode.type === "person") {
      const { birth, death, name, nationality, field } = selectedNode;
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
      const { year, title, category, text } = selectedNode;
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
