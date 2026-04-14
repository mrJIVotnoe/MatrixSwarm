import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Network, Map as MapIcon } from 'lucide-react';

interface TopologyData {
  nodes: { id: string; lat: number; lng: number; status: string; trust_score: number; power_rating: string }[];
  links: { source: string; target: string; distance: number }[];
}

export const NetworkTopology: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [topology, setTopology] = useState<TopologyData | null>(null);

  useEffect(() => {
    const fetchTopology = async () => {
      try {
        const res = await fetch('/api/v1/mesh/topology');
        if (res.ok) {
          setTopology(await res.json());
        }
      } catch (e) {
        console.error("Failed to fetch topology");
      }
    };

    fetchTopology();
    const interval = setInterval(fetchTopology, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!topology || !svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = 200;
    const svg = d3.select(svgRef.current);
    
    svg.selectAll("*").remove();

    // Setup simulation
    const simulation = d3.forceSimulation(topology.nodes as any)
      .force("link", d3.forceLink(topology.links).id((d: any) => d.id).distance(50))
      .force("charge", d3.forceManyBody().strength(-30))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(10));

    // Draw links
    const link = svg.append("g")
      .selectAll("line")
      .data(topology.links)
      .join("line")
      .attr("stroke", "rgba(52, 211, 153, 0.2)")
      .attr("stroke-width", 1);

    // Draw nodes
    const node = svg.append("g")
      .selectAll("circle")
      .data(topology.nodes)
      .join("circle")
      .attr("r", (d: any) => d.power_rating.includes("Heavy") ? 6 : d.power_rating.includes("Medium") ? 4 : 3)
      .attr("fill", (d: any) => d.trust_score >= 90 ? "#3b82f6" : "#34d399") // Blue for magistrates, green for others
      .attr("stroke", "#000")
      .attr("stroke-width", 1.5)
      .call(d3.drag<SVGCircleElement, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Add titles for hover
    node.append("title")
      .text((d: any) => `Node: ${d.id.substring(0, 8)}\nClass: ${d.power_rating}\nTrust: ${d.trust_score}`);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => Math.max(6, Math.min(width - 6, d.x)))
        .attr("cy", (d: any) => Math.max(6, Math.min(height - 6, d.y)));
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [topology]);

  return (
    <div className="bg-neutral-900 border border-emerald-500/30 p-5 rounded-sm">
      <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-emerald-400">
        <MapIcon className="w-4 h-4" />
        MESH-ТОПОЛОГИЯ (СЕНСОРНАЯ СЕТЬ)
      </h2>
      <div className="relative w-full h-[200px] bg-black border border-emerald-500/10 rounded-sm overflow-hidden">
        <svg ref={svgRef} className="w-full h-full" />
        <div className="absolute bottom-2 left-2 text-[8px] text-emerald-500/50 uppercase">
          P2P Connections (Simulated Bluetooth/WiFi)
        </div>
        <div className="absolute top-2 right-2 flex flex-col gap-1 text-[8px]">
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Magistrate</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Node</div>
        </div>
      </div>
    </div>
  );
};
