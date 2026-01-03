import React, { useEffect, useRef, useState } from 'react';
import {
  select,
  zoom as d3Zoom,
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  drag as d3Drag
} from 'd3';
import { GraphNode, GraphEdge } from '../types';

interface VisualizerProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  loading: boolean;
  isDarkMode: boolean;
  emptyMessage?: string;
}

const Visualizer: React.FC<VisualizerProps> = ({ nodes: propNodes, edges: propEdges, loading, isDarkMode, emptyMessage }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Handle Resize
  useEffect(() => {
    const updateSize = () => {
      if (wrapperRef.current) {
        setDimensions({
          width: wrapperRef.current.clientWidth,
          height: wrapperRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (loading || !svgRef.current) return;
    if (propNodes.length === 0 && propEdges.length === 0) {
      // Clear if empty
      const svg = select(svgRef.current);
      svg.selectAll("*").remove();
      return;
    }

    const svg = select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const { width, height } = dimensions;

    // --- Color Palette & Theming ---
    const colors = {
      background: isDarkMode ? "#0f172a" : "#f8fafc", // slate-950 : slate-50
      link: isDarkMode ? "#475569" : "#94a3b8",      // slate-600 : slate-400
      linkHover: isDarkMode ? "#94a3b8" : "#64748b",
      text: isDarkMode ? "#e2e8f0" : "#1e293b",      // slate-200 : slate-800
      subText: isDarkMode ? "#94a3b8" : "#64748b",   // slate-400 : slate-500
      nodeStroke: isDarkMode ? "#1e293b" : "#ffffff", // slate-900 : white
      nodeText: "#ffffff",
      arrow: isDarkMode ? "#475569" : "#94a3b8",
      pillBg: isDarkMode ? "#1e293b" : "#ffffff",    // Background for edge labels
    };

    // Zoom behavior
    const zoom = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // --- Definitions (Filters & Gradients) ---
    const defs = svg.append("defs");

    // Drop Shadow Filter
    const filter = defs.append("filter")
      .attr("id", "drop-shadow")
      .attr("height", "130%");

    filter.append("feGaussianBlur")
      .attr("in", "SourceAlpha")
      .attr("stdDeviation", 2)
      .attr("result", "blur");

    filter.append("feOffset")
      .attr("in", "blur")
      .attr("dx", 1)
      .attr("dy", 2)
      .attr("result", "offsetBlur");

    filter.append("feFlood")
      .attr("flood-color", isDarkMode ? "#000" : "#64748b")
      .attr("flood-opacity", 0.2)
      .attr("result", "offsetColor");

    filter.append("feComposite")
      .attr("in", "offsetColor")
      .attr("in2", "offsetBlur")
      .attr("operator", "in")
      .attr("result", "offsetBlur");

    filter.append("feMerge")
      .call(merge => {
        merge.append("feMergeNode").attr("in", "offsetBlur");
        merge.append("feMergeNode").attr("in", "SourceGraphic");
      });

    // Arrow Marker
    defs.append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10) // Tip of the arrow (10) aligns with the end of the line
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", colors.arrow);

    const g = svg.append("g");

    const links = propEdges.map(d => ({ ...d }));
    const nodes = propNodes.map(d => ({ ...d }));

    // --- Force Simulation ---
    const simulation = forceSimulation(nodes as any)
      .force("link", forceLink(links).id((d: any) => d.id).distance(150)) // Increased distance
      .force("charge", forceManyBody().strength(-600)) // Stronger repulsion
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide(60)); // Initial placeholder

    // --- Render Links ---
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", colors.link)
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.8)
      .attr("marker-end", "url(#arrow)")
      .style("transition", "stroke 0.2s");

    // --- Render Link Labels (Pills) ---
    const linkLabelGroup = g.append("g")
      .attr("class", "link-labels")
      .selectAll("g")
      .data(links)
      .enter().append("g");

    // Background Pill for Label
    linkLabelGroup.append("rect")
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("fill", colors.pillBg)
      .attr("fill-opacity", 0.9)
      .attr("stroke", colors.link)
      .attr("stroke-width", 0.5);

    // Label Text
    const linkText = linkLabelGroup.append("text")
      .text((d: any) => d.label || "")
      .attr("fill", colors.subText)
      .attr("font-size", "10px")
      .attr("font-family", "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em");

    // Sizing the pill based on text
    linkLabelGroup.each(function (d: any) {
      if (!d.label) {
        select(this).select("rect").attr("display", "none");
        return;
      }
      const bbox = select(this).select("text").node()?.getBBox();
      if (bbox) {
        select(this).select("rect")
          .attr("x", bbox.x - 4)
          .attr("y", bbox.y - 2)
          .attr("width", bbox.width + 8)
          .attr("height", bbox.height + 4);
      }
    });

    // --- Render Nodes ---
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .attr("cursor", "grab")
      .call(d3Drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Node Circle (radius will be set dynamically)
    const circles = node.append("circle")
      .attr("fill", (d: any) => d.color || "#3b82f6") // Default blue
      .attr("stroke", colors.nodeStroke)
      .attr("stroke-width", 3)
      .style("filter", "url(#drop-shadow)")
      .style("transition", "fill 0.3s");

    // Node Label
    node.append("text")
      .text((d: any) => d.label)
      .attr("dy", "0.35em") // Vertically center
      .attr("text-anchor", "middle")
      .attr("font-weight", "600")
      .attr("fill", colors.nodeText)
      .attr("font-size", "12px")
      .attr("font-family", "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif")
      .style("pointer-events", "none")
      .style("text-shadow", "0px 1px 2px rgba(0,0,0,0.3)") // Subtle text shadow for readability
      .each(function (d: any) {
        // Dynamic Sizing Logic
        const bbox = (this as SVGTextElement).getBBox();
        const minRadius = 25;
        const padding = 10;
        // Calculate radius based on half width of text + padding
        d.r = Math.max(minRadius, (bbox.width / 2) + padding);
      });

    // Apply calculated radius
    circles.attr("r", (d: any) => d.r);

    // Update collision force with dynamic radii
    simulation.force("collide", forceCollide((d: any) => d.r + 15));
    simulation.alpha(1).restart();

    // Hover Effects
    node.on("mouseover", function (event, d: any) {
      select(this).select("circle")
        .transition().duration(200)
        .attr("r", (d.r || 25) + 3)
        .attr("stroke-width", 4);
    })
      .on("mouseout", function (event, d: any) {
        select(this).select("circle")
          .transition().duration(200)
          .attr("r", d.r || 25)
          .attr("stroke-width", 3);
      });

    // --- Simulation Tick ---
    simulation.on("tick", () => {
      // Update Links with dynamic start/end points on circle edge
      link
        .attr("x1", (d: any) => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          return d.source.x + (dx / dist) * (d.source.r || 25);
        })
        .attr("y1", (d: any) => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          return d.source.y + (dy / dist) * (d.source.r || 25);
        })
        .attr("x2", (d: any) => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          // End at circle edge + gap for arrow
          return d.target.x - (dx / dist) * ((d.target.r || 25) + 4);
        })
        .attr("y2", (d: any) => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          return d.target.y - (dy / dist) * ((d.target.r || 25) + 4);
        });

      // Update Link Labels (Pills)
      linkLabelGroup
        .attr("transform", (d: any) => {
          const x = (d.source.x + d.target.x) / 2;
          const y = (d.source.y + d.target.y) / 2;
          return `translate(${x}, ${y})`;
        });

      // Update Nodes
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // --- Drag Functions ---
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      select(event.sourceEvent.target.parentNode).attr("cursor", "grabbing");
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
      select(event.sourceEvent.target.parentNode).attr("cursor", "grab");
    }

    // --- Animation on Mount ---
    // Pop in effect
    node.attr("opacity", 0)
      .transition()
      .duration(500)
      .delay((d, i) => i * 50)
      .attr("opacity", 1);

    link.attr("opacity", 0)
      .transition()
      .duration(500)
      .attr("opacity", 1);

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [propNodes, propEdges, dimensions, isDarkMode, loading]);

  const downloadImage = () => {
    if (!svgRef.current) return;

    const svgElement = svgRef.current;
    const { width, height } = dimensions;

    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", width.toString());
    clone.setAttribute("height", height.toString());
    clone.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(clone);

    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!source.match(/^<svg[^>]+xmlns:xlink="http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.src = url;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.fillStyle = isDarkMode ? "#0f172a" : "#f1f5f9";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = "vision-code-visualization.png";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      URL.revokeObjectURL(url);
    };
  };

  return (
    <div ref={wrapperRef} className="w-full h-full relative bg-slate-50 dark:bg-slate-950 overflow-hidden rounded-lg shadow-inner transition-colors duration-200">
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm transition-colors duration-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-blue-500 dark:text-blue-400 font-mono text-sm animate-pulse">Analyzing Execution Trace...</p>
        </div>
      )}
      {!loading && propNodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-8 text-center">
          <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
          <p className="font-medium text-lg mb-2">Ready to Visualize</p>
          <p className="text-sm max-w-xs opacity-75">{emptyMessage || "Run the code to see the data structures come to life interactively."}</p>
        </div>
      )}

      {propNodes.length > 0 && (
        <button
          onClick={downloadImage}
          className="absolute top-4 right-4 z-20 p-2 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm backdrop-blur-sm transition-all border border-slate-200 dark:border-slate-700 group"
          title="Download PNG"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      )}

      <svg ref={svgRef} width="100%" height="100%" className="cursor-grab active:cursor-grabbing touch-none" />
    </div>
  );
};

export default Visualizer;