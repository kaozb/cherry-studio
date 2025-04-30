import { Agent } from '@renderer/types'
import { useEffect, useState } from 'react'

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
  const [agents, setAgents] = useState<Agent[]>([])

  const resourcesPath = `http://userai.tech.intra.nsfocus.com/static/cherry/agents.json?rand=${Math.random()}`
  useEffect(() => {
    const loadAgents = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const response = await fetch(resourcesPath)
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }
        const agentsData = await response.json() as Agent[]
        setAgents(agentsData)
      } catch (error) {
        console.error("Failed to load agents:", error)
      }
    }
    
    loadAgents()
  }, [resourcesPath])
  return agents
}
