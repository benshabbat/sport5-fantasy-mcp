#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';

// Fantasy League API configuration
interface Sport5Config {
  baseUrl?: string;
  authCookie?: string;
  userId?: string;
  leagueId?: string;
}

interface Player {
  id: string;
  name: string;
  team: string;
  position: string;
  price: number;
  points: number;
  form: number[];
  injuryStatus?: string;
  nextFixtures: string[];
  ownership: number;
}

interface Team {
  players: Player[];
  formation: string;
  captain: string;
  viceCaptain: string;
  totalCost: number;
  availableMoney: number;
  transfers: number;
}

interface GameweekStats {
  averageScore: number;
  highestScore: number;
  topPlayer: string;
  mostCaptained: string;
  transfersMade: number;
}

class Sport5FantasyAPI {
  private config: Sport5Config;
  private session: any;

  constructor(config: Sport5Config) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || 'https://fantasyleague.sport5.co.il'
    };
    this.session = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    // Add auth cookie if available
    if (this.config.authCookie) {
      this.session.defaults.headers['Cookie'] = this.config.authCookie;
    }
  }

  async getMyTeam(): Promise<Team> {
    try {
      const response = await this.session.get('/api/my-team');
      return this.parseTeamData(response.data);
    } catch (error) {
      console.error('Error fetching team data:', error);
      throw new Error('Failed to fetch team data. Make sure you\'re authenticated.');
    }
  }

  async getAllPlayers(): Promise<Player[]> {
    try {
      const response = await this.session.get('/api/players');
      return this.parsePlayersData(response.data);
    } catch (error) {
      console.error('Error fetching players data:', error);
      // Fallback to scraping if API fails
      return this.scrapePlayersData();
    }
  }

  async getTopPerformers(gameweek?: number): Promise<Player[]> {
    try {
      const endpoint = gameweek ? `/api/players/top/${gameweek}` : '/api/players/top';
      const response = await this.session.get(endpoint);
      return this.parsePlayersData(response.data);
    } catch (error) {
      console.error('Error fetching top performers:', error);
      return [];
    }
  }

  async getGameweekStats(gameweek?: number): Promise<GameweekStats> {
    try {
      const endpoint = gameweek ? `/api/gameweek/${gameweek}` : '/api/gameweek/current';
      const response = await this.session.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error fetching gameweek stats:', error);
      return {
        averageScore: 0,
        highestScore: 0,
        topPlayer: '',
        mostCaptained: '',
        transfersMade: 0
      };
    }
  }

  async makeTransfer(playerOutId: string, playerInId: string): Promise<boolean> {
    try {
      const response = await this.session.post('/api/transfers', {
        playerOut: playerOutId,
        playerIn: playerInId
      });
      return response.status === 200;
    } catch (error) {
      console.error('Error making transfer:', error);
      return false;
    }
  }

  async setCaptain(playerId: string, viceCaptainId?: string): Promise<boolean> {
    try {
      const response = await this.session.post('/api/captain', {
        captain: playerId,
        viceCaptain: viceCaptainId
      });
      return response.status === 200;
    } catch (error) {
      console.error('Error setting captain:', error);
      return false;
    }
  }

  async optimizeTeam(): Promise<{
    recommendedChanges: string[];
    suggestedCaptain: string;
    transfersNeeded: number;
    expectedPoints: number;
  }> {
    try {
      const [team, allPlayers, gameweekStats] = await Promise.all([
        this.getMyTeam(),
        this.getAllPlayers(),
        this.getGameweekStats()
      ]);

      const recommendations = this.analyzeTeam(team, allPlayers, gameweekStats);
      return recommendations;
    } catch (error) {
      console.error('Error optimizing team:', error);
      throw new Error('Failed to optimize team');
    }
  }

  private analyzeTeam(team: Team, allPlayers: Player[], gameweekStats: GameweekStats): {
    recommendedChanges: string[];
    suggestedCaptain: string;
    transfersNeeded: number;
    expectedPoints: number;
  } {
    const recommendations: string[] = [];
    let transfersNeeded = 0;
    let expectedPoints = 0;

    // Analyze each position
    const positionAnalysis = this.analyzeByPosition(team, allPlayers);
    
    // Find underperforming players
    const underperformers = team.players.filter(player => {
      const avgPoints = player.form.reduce((a, b) => a + b, 0) / player.form.length;
      return avgPoints < 3 && player.ownership < 10;
    });

    underperformers.forEach(player => {
      const betterOptions = this.findBetterOptions(player, allPlayers, team.availableMoney);
      if (betterOptions.length > 0) {
        recommendations.push(`Consider replacing ${player.name} with ${betterOptions[0].name}`);
        transfersNeeded++;
      }
    });

    // Captain recommendation
    const captainCandidate = this.findBestCaptain(team.players);
    
    // Calculate expected points
    expectedPoints = team.players.reduce((total, player) => {
      const recentForm = player.form.slice(-3).reduce((a, b) => a + b, 0) / 3;
      return total + recentForm;
    }, 0);

    return {
      recommendedChanges: recommendations,
      suggestedCaptain: captainCandidate.name,
      transfersNeeded,
      expectedPoints: Math.round(expectedPoints)
    };
  }

  private analyzeByPosition(team: Team, allPlayers: Player[]): any {
    const positions = ['GK', 'DEF', 'MID', 'FWD'];
    const analysis: any = {};

    positions.forEach(pos => {
      const positionPlayers = team.players.filter(p => p.position === pos);
      const positionAverage = allPlayers
        .filter(p => p.position === pos)
        .reduce((sum, p) => sum + p.points, 0) / allPlayers.filter(p => p.position === pos).length;
      
      analysis[pos] = {
        players: positionPlayers,
        averagePoints: positionAverage,
        needsUpgrade: positionPlayers.some(p => p.points < positionAverage * 0.8)
      };
    });

    return analysis;
  }

  private findBetterOptions(player: Player, allPlayers: Player[], budget: number): Player[] {
    return allPlayers
      .filter(p => 
        p.position === player.position &&
        p.price <= player.price + budget &&
        p.points > player.points &&
        p.id !== player.id
      )
      .sort((a, b) => b.points - a.points)
      .slice(0, 3);
  }

  private findBestCaptain(players: Player[]): Player {
    return players
      .filter(p => !p.injuryStatus)
      .sort((a, b) => {
        const aForm = a.form.slice(-3).reduce((sum, val) => sum + val, 0) / 3;
        const bForm = b.form.slice(-3).reduce((sum, val) => sum + val, 0) / 3;
        return bForm - aForm;
      })[0];
  }

  private parseTeamData(data: any): Team {
    // Parse the team data from API response
    return {
      players: data.players?.map(this.parsePlayerData) || [],
      formation: data.formation || '4-4-2',
      captain: data.captain || '',
      viceCaptain: data.viceCaptain || '',
      totalCost: data.totalCost || 0,
      availableMoney: data.availableMoney || 0,
      transfers: data.transfers || 0
    };
  }

  private parsePlayersData(data: any): Player[] {
    if (!data || !Array.isArray(data)) return [];
    return data.map(this.parsePlayerData);
  }

  private parsePlayerData = (playerData: any): Player => ({
    id: playerData.id || '',
    name: playerData.name || '',
    team: playerData.team || '',
    position: playerData.position || '',
    price: playerData.price || 0,
    points: playerData.points || 0,
    form: playerData.form || [0, 0, 0, 0, 0],
    injuryStatus: playerData.injuryStatus,
    nextFixtures: playerData.nextFixtures || [],
    ownership: playerData.ownership || 0
  });

  private async scrapePlayersData(): Promise<Player[]> {
    try {
      const response = await this.session.get('/players');
      const $ = cheerio.load(response.data);
      const players: Player[] = [];

      $('.player-row').each((index, element) => {
        const $el = $(element);
        players.push({
          id: String($el.data('player-id')) || '',
          name: $el.find('.player-name').text().trim(),
          team: $el.find('.player-team').text().trim(),
          position: $el.find('.player-position').text().trim(),
          price: parseFloat($el.find('.player-price').text().replace(/[^\d.]/g, '')) || 0,
          points: parseInt($el.find('.player-points').text()) || 0,
          form: [0, 0, 0, 0, 0], // Default form
          nextFixtures: [],
          ownership: 0
        });
      });

      return players;
    } catch (error) {
      console.error('Error scraping players data:', error);
      return [];
    }
  }
}

// MCP Server setup
const server = new Server(
  {
    name: 'sport5-fantasy-league',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let fantasyAPI: Sport5FantasyAPI;

// Initialize API with configuration
function initializeAPI(config?: Partial<Sport5Config>) {
  const defaultConfig: Sport5Config = {
    baseUrl: 'https://fantasyleague.sport5.co.il'
  };
  fantasyAPI = new Sport5FantasyAPI({ ...defaultConfig, ...config });
}

// Define tools
const tools: Tool[] = [
  {
    name: 'get_my_team',
    description: 'Get current fantasy team lineup, formation, and available budget',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_all_players',
    description: 'Get all available players with stats, prices, and form',
    inputSchema: {
      type: 'object',
      properties: {
        position: {
          type: 'string',
          description: 'Filter by position (GK, DEF, MID, FWD)',
        },
        maxPrice: {
          type: 'number',
          description: 'Maximum price filter',
        },
      },
    },
  },
  {
    name: 'get_top_performers',
    description: 'Get top performing players for current or specific gameweek',
    inputSchema: {
      type: 'object',
      properties: {
        gameweek: {
          type: 'number',
          description: 'Specific gameweek number (optional)',
        },
        limit: {
          type: 'number',
          description: 'Number of top performers to return (default: 10)',
        },
      },
    },
  },
  {
    name: 'optimize_team',
    description: 'Analyze current team and provide optimization recommendations',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'make_transfer',
    description: 'Make a player transfer (sell one player, buy another)',
    inputSchema: {
      type: 'object',
      properties: {
        playerOutId: {
          type: 'string',
          description: 'ID of player to sell',
        },
        playerInId: {
          type: 'string',
          description: 'ID of player to buy',
        },
      },
      required: ['playerOutId', 'playerInId'],
    },
  },
  {
    name: 'set_captain',
    description: 'Set team captain and vice-captain',
    inputSchema: {
      type: 'object',
      properties: {
        captainId: {
          type: 'string',
          description: 'Player ID to set as captain',
        },
        viceCaptainId: {
          type: 'string',
          description: 'Player ID to set as vice-captain (optional)',
        },
      },
      required: ['captainId'],
    },
  },
  {
    name: 'get_gameweek_stats',
    description: 'Get statistics for current or specific gameweek',
    inputSchema: {
      type: 'object',
      properties: {
        gameweek: {
          type: 'number',
          description: 'Specific gameweek number (optional)',
        },
      },
    },
  },
  {
    name: 'configure_api',
    description: 'Configure API settings including authentication',
    inputSchema: {
      type: 'object',
      properties: {
        authCookie: {
          type: 'string',
          description: 'Authentication cookie from browser',
        },
        userId: {
          type: 'string',
          description: 'User ID',
        },
        leagueId: {
          type: 'string',
          description: 'League ID',
        },
      },
    },
  },
];

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!fantasyAPI) {
    initializeAPI();
  }

  try {
    switch (name) {
      case 'configure_api':
        initializeAPI(args as Partial<Sport5Config>);
        return {
          content: [
            {
              type: 'text',
              text: 'API configured successfully. You can now use other tools.',
            },
          ],
        };

      case 'get_my_team':
        const team = await fantasyAPI.getMyTeam();
        return {
          content: [
            {
              type: 'text',
              text: `**הקבוצה שלך:**

**מערך:** ${team.formation}
**קפטן:** ${team.captain}
**סגן קפטן:** ${team.viceCaptain}
**עלות כוללת:** ₪${team.totalCost}
**יתרה זמינה:** ₪${team.availableMoney}
**מעברים זמינים:** ${team.transfers}

**השחקנים:**
${team.players.map(player => 
  `• ${player.name} (${player.position}) - ${player.team} - ₪${player.price} - ${player.points} נקודות`
).join('\n')}`,
            },
          ],
        };

      case 'get_all_players':
        let players = await fantasyAPI.getAllPlayers();
        
        if (args?.position && typeof args.position === 'string') {
          players = players.filter(p => p.position === args.position);
        }
        
        if (args?.maxPrice && typeof args.maxPrice === 'number') {
          const maxPrice = args.maxPrice;
          players = players.filter(p => p.price <= maxPrice);
        }

        // Sort by points descending
        players.sort((a, b) => b.points - a.points);

        return {
          content: [
            {
              type: 'text',
              text: `**שחקנים זמינים (${players.length} שחקנים):**

${players.slice(0, 20).map((player, index) => 
  `${index + 1}. **${player.name}** (${player.position}) - ${player.team}
   מחיר: ₪${player.price} | נקודות: ${player.points} | בעלות: ${player.ownership}%
   ${player.injuryStatus ? `🚑 ${player.injuryStatus}` : ''}`
).join('\n\n')}

${players.length > 20 ? `\n...ועוד ${players.length - 20} שחקנים` : ''}`,
            },
          ],
        };

      case 'get_top_performers':
        const gameweek = typeof args?.gameweek === 'number' ? args.gameweek : undefined;
        const topPerformers = await fantasyAPI.getTopPerformers(gameweek);
        const limit = typeof args?.limit === 'number' ? args.limit : 10;

        return {
          content: [
            {
              type: 'text',
              text: `**השחקנים הטובים ביותר:**

${topPerformers.slice(0, limit).map((player, index) => 
  `${index + 1}. **${player.name}** (${player.position}) - ${player.team}
   נקודות: ${player.points} | מחיר: ₪${player.price} | בעלות: ${player.ownership}%
   פורמה: ${player.form.slice(-3).join(', ')} (3 משחקים אחרונים)`
).join('\n\n')}`,
            },
          ],
        };

      case 'optimize_team':
        const optimization = await fantasyAPI.optimizeTeam();
        
        return {
          content: [
            {
              type: 'text',
              text: `**המלצות לאופטימיזציה של הקבוצה:**

**קפטן מומלץ:** ${optimization.suggestedCaptain}
**נקודות צפויות:** ${optimization.expectedPoints}
**מעברים נדרשים:** ${optimization.transfersNeeded}

**שינויים מומלצים:**
${optimization.recommendedChanges.length > 0 
  ? optimization.recommendedChanges.map(change => `• ${change}`).join('\n')
  : '• הקבוצה שלך נראית טוב כרגע!'
}

**טיפים נוספים:**
• בדוק שחקנים פצועים לפני כל סיבוב
• שקול את לוח הזמנים הקרוב של הקבוצות
• שמור מעברים למקרי חירום`,
            },
          ],
        };

      case 'make_transfer':
        const transferSuccess = await fantasyAPI.makeTransfer(
          args?.playerOutId as string,
          args?.playerInId as string
        );

        return {
          content: [
            {
              type: 'text',
              text: transferSuccess 
                ? '✅ המעבר בוצע בהצלחה!'
                : '❌ המעבר נכשל. בדוק שיש לך מעברים זמינים ויתרה מספקת.',
            },
          ],
        };

      case 'set_captain':
        const captainSuccess = await fantasyAPI.setCaptain(
          args?.captainId as string,
          args?.viceCaptainId as string
        );

        return {
          content: [
            {
              type: 'text',
              text: captainSuccess
                ? '✅ הקפטן והסגן נקבעו בהצלחה!'
                : '❌ הגדרת הקפטן נכשלה.',
            },
          ],
        };

      case 'get_gameweek_stats':
        const statsGameweek = typeof args?.gameweek === 'number' ? args.gameweek : undefined;
        const stats = await fantasyAPI.getGameweekStats(statsGameweek);

        return {
          content: [
            {
              type: 'text',
              text: `**סטטיסטיקות הסיבוב:**

**ציון ממוצע:** ${stats.averageScore}
**ציון גבוה ביותר:** ${stats.highestScore}
**שחקן הסיבוב:** ${stats.topPlayer}
**הקפטן הפופולרי ביותר:** ${stats.mostCaptained}
**מעברים בוצעו:** ${stats.transfersMade}`,
            },
          ],
        };

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Sport5 Fantasy League MCP Server running on stdio');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { server };
