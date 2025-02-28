import { Agent } from '@renderer/types'
import { runAsyncFunction } from '@renderer/utils'
import { useEffect, useState } from 'react'

// let _agents: Agent[] = [] // No longer needed as we fetch fresh each time.
const AGENTS_URL = 'http://userai.tech.intra.nsfocus.com/static/cherry/agents.json';

export const getAgentsFromSystemAgents = (systemAgents: any) => {
  const agents: Agent[] = []
  for (let i = 0; i < systemAgents.length; i++) {
    for (let j = 0; j < systemAgents[i].group.length; j++) {
      const agent = { ...systemAgents[i], group: systemAgents[i].group[j], topics: [], type: 'agent' } as Agent
      agents.push(agent)
    }
  }
  return agents
}

export function useSystemAgents() {
  const [agents, setAgents] = useState<Agent[]>([]); // Initialize with an empty array.

  useEffect(() => {
    runAsyncFunction(async () => {
      try {
        const response = await fetch(AGENTS_URL);

        if (!response.ok) {
          console.error(`Failed to fetch agents from ${AGENTS_URL}. Status: ${response.status}`);
          // Optionally, set agents to an empty array or a default value if the fetch fails.
          setAgents([]);
          return;
        }

        const data = await response.json();
        const parsedAgents: Agent[] = data; // Directly cast after parsing.

        // Basic validation to ensure we got an array of agents.
        if (!Array.isArray(parsedAgents)) {
          console.error("Invalid data format received from agents.json. Expected an array.");
          setAgents([]);
          return;
        }

        setAgents(parsedAgents);
      } catch (error) {
        console.error("Error fetching or parsing agents.json:", error);
        // Handle the error appropriately, e.g., set a default value or show an error message.
        setAgents([]);
      }
    });
  }, []); // The effect now only runs once on mount.

  return agents;
}