/**
 * Agent Logger
 * 
 * Creates beautifully formatted logs for AI agent interactions.
 * Makes it easy to see prompts, responses, and tool calls.
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * Format a section header with decorative borders
 */
function formatHeader(title, char = '═', width = 80) {
  const padding = Math.max(0, width - title.length - 4);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return `\n${char.repeat(width)}\n${char} ${' '.repeat(leftPad)}${title}${' '.repeat(rightPad)} ${char}\n${char.repeat(width)}\n`;
}

/**
 * Format a sub-header
 */
function formatSubHeader(title, char = '─', width = 60) {
  return `\n${char.repeat(width)}\n  ${title}\n${char.repeat(width)}\n`;
}

/**
 * Format JSON with proper indentation
 */
function formatJson(obj, indent = 2) {
  try {
    return JSON.stringify(obj, null, indent);
  } catch {
    return String(obj);
  }
}

/**
 * Truncate long strings for readability
 */
function truncate(str, maxLength = 500) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '\n... [truncated, ' + (str.length - maxLength) + ' more chars]';
}

/**
 * Main logger class for agent interactions
 */
export class AgentLogger {
  constructor(sessionId) {
    this.sessionId = sessionId || new Date().toISOString().replace(/[:.]/g, '-');
    this.logs = [];
    this.startTime = Date.now();
  }

  /**
   * Log the start of a generation session
   */
  logSessionStart(options) {
    this.logs.push(formatHeader('🎬 GENERATION SESSION STARTED', '═', 80));
    this.logs.push(`📅 Timestamp: ${new Date().toISOString()}`);
    this.logs.push(`🆔 Session ID: ${this.sessionId}`);
    this.logs.push('');
    
    if (options) {
      this.logs.push(formatSubHeader('📋 Input Parameters'));
      this.logs.push(formatJson(options));
    }
  }

  /**
   * Log project settings summary
   */
  logProjectSettings(settings) {
    this.logs.push(formatSubHeader('⚙️ Project Settings'));
    
    // Characters summary
    const chars = settings?.characters || [];
    this.logs.push(`\n👥 Characters (${chars.length}):`);
    chars.forEach((c, i) => {
      const hasPrompt = c.fiboStructuredPrompt ? '✅' : '❌';
      this.logs.push(`   ${i + 1}. ${c.name} (ID: ${c.id}) [fiboPrompt: ${hasPrompt}]`);
    });

    // Locations summary
    const locs = settings?.locations || [];
    this.logs.push(`\n🏞️ Locations (${locs.length}):`);
    locs.forEach((l, i) => {
      const hasPrompt = l.fiboStructuredPrompt ? '✅' : '❌';
      this.logs.push(`   ${i + 1}. ${l.name} (ID: ${l.id}) [fiboPrompt: ${hasPrompt}]`);
    });

    // Style info
    this.logs.push(`\n🎨 Art Style: ${settings?.artStyle?.name || 'Not specified'}`);
    this.logs.push(`📐 Style Medium: ${settings?.styleMedium || 'Not specified'}`);
    this.logs.push(`🌈 Mood: ${settings?.mood || 'Not specified'}`);
  }

  /**
   * Log an agent's system prompt
   */
  logAgentPrompt(agentName, systemPrompt, userPrompt) {
    this.logs.push(formatHeader(`🤖 AGENT: ${agentName.toUpperCase()}`, '═', 80));
    
    // Log as COMPLETE PROMPT - exactly what the AI sees
    this.logs.push(formatSubHeader('📋 COMPLETE PROMPT TO AI (System + User)'));
    this.logs.push('='.repeat(80));
    this.logs.push('>>> START OF FULL PROMPT <<<');
    this.logs.push('='.repeat(80));
    this.logs.push('');
    
    if (systemPrompt) {
      this.logs.push('──────────────── SYSTEM MESSAGE ────────────────');
      this.logs.push(systemPrompt);
      this.logs.push('');
    }
    
    if (userPrompt) {
      this.logs.push('──────────────── USER MESSAGE ────────────────');
      this.logs.push(userPrompt);
      this.logs.push('');
    }
    
    this.logs.push('='.repeat(80));
    this.logs.push('>>> END OF FULL PROMPT <<<');
    this.logs.push('='.repeat(80));
  }

  /**
   * Log an agent's response
   */
  logAgentResponse(agentName, response, duration) {
    this.logs.push(formatSubHeader(`✅ ${agentName} Response`));
    
    if (duration) {
      this.logs.push(`⏱️ Duration: ${duration}ms\n`);
    }

    if (typeof response === 'string') {
      this.logs.push(response);
    } else {
      this.logs.push(formatJson(response));
    }
  }

  /**
   * Log a tool call
   */
  logToolCall(toolName, input, output) {
    this.logs.push(formatSubHeader(`🔧 Tool Call: ${toolName}`));
    
    this.logs.push('\n📥 INPUT:');
    this.logs.push(formatJson(input));
    
    this.logs.push('\n📤 OUTPUT:');
    if (typeof output === 'string') {
      this.logs.push(truncate(output, 2000));
    } else {
      this.logs.push(formatJson(output));
    }
  }

  /**
   * Log FIBO structured prompt being sent
   */
  logFiboRequest(structuredPrompt, aspectRatio) {
    this.logs.push(formatSubHeader('🎨 FIBO Image Generation Request'));
    
    this.logs.push(`📐 Aspect Ratio: ${aspectRatio}\n`);
    
    // Log key parts of structured prompt in readable format
    if (structuredPrompt) {
      this.logs.push('📝 Short Description:');
      this.logs.push(`   ${structuredPrompt.short_description || 'N/A'}\n`);
      
      this.logs.push('🧑‍🤝‍🧑 Objects:');
      (structuredPrompt.objects || []).forEach((obj, i) => {
        this.logs.push(`   ${i + 1}. ${obj.description}`);
        this.logs.push(`      - Location: ${obj.location}`);
        this.logs.push(`      - Action: ${obj.action}`);
        this.logs.push(`      - Colors: ${obj.shape_and_color}`);
      });
      
      this.logs.push(`\n🏞️ Background: ${structuredPrompt.background_setting || 'N/A'}`);
      
      if (structuredPrompt.lighting) {
        this.logs.push(`\n💡 Lighting:`);
        this.logs.push(`   - Conditions: ${structuredPrompt.lighting.conditions}`);
        this.logs.push(`   - Direction: ${structuredPrompt.lighting.direction}`);
        this.logs.push(`   - Shadows: ${structuredPrompt.lighting.shadows}`);
      }
      
      if (structuredPrompt.aesthetics) {
        this.logs.push(`\n✨ Aesthetics:`);
        this.logs.push(`   - Mood: ${structuredPrompt.aesthetics.mood_atmosphere}`);
        this.logs.push(`   - Colors: ${structuredPrompt.aesthetics.color_scheme}`);
        this.logs.push(`   - Composition: ${structuredPrompt.aesthetics.composition}`);
      }
      
      this.logs.push(`\n🎬 Style: ${structuredPrompt.artistic_style || 'N/A'}`);
      this.logs.push(`📺 Medium: ${structuredPrompt.style_medium || 'N/A'}`);
      
      // Also log full JSON for reference
      this.logs.push('\n📋 Full Structured Prompt (JSON):');
      this.logs.push(formatJson(structuredPrompt));
    }
  }

  /**
   * Log FIBO response
   */
  logFiboResponse(success, imageUrl, seed, error) {
    this.logs.push(formatSubHeader('🖼️ FIBO Generation Result'));
    
    if (success) {
      this.logs.push(`✅ Success!`);
      this.logs.push(`🔗 Image URL: ${imageUrl}`);
      this.logs.push(`🎲 Seed: ${seed || 'N/A'}`);
    } else {
      this.logs.push(`❌ Failed!`);
      this.logs.push(`💥 Error: ${error}`);
    }
  }

  /**
   * Log panel generation progress
   */
  logPanelProgress(pageNumber, panelNumber, totalPanels) {
    this.logs.push(formatHeader(`📄 PAGE ${pageNumber} - PANEL ${panelNumber}/${totalPanels}`, '─', 60));
  }

  /**
   * Log character/location lookup for consistency
   */
  logConsistencyData(characterPrompts, locationPrompt) {
    this.logs.push(formatSubHeader('🔍 Consistency Data Lookup'));
    
    this.logs.push('\n👥 Characters for this panel:');
    (characterPrompts || []).forEach((cp, i) => {
      const hasOriginal = cp.fiboStructuredPrompt ? '✅ HAS ORIGINAL PROMPT' : '⚠️ NO ORIGINAL PROMPT';
      this.logs.push(`   ${i + 1}. ${cp.name} (${cp.id})`);
      this.logs.push(`      Action: ${cp.action}`);
      this.logs.push(`      Expression: ${cp.expression}`);
      this.logs.push(`      Status: ${hasOriginal}`);
      
      if (cp.fiboStructuredPrompt?.objects?.[0]) {
        const obj = cp.fiboStructuredPrompt.objects[0];
        this.logs.push(`      Original Visual: ${truncate(obj.shape_and_color || '', 100)}`);
      }
    });
    
    if (locationPrompt) {
      const hasOriginal = locationPrompt.fiboStructuredPrompt ? '✅ HAS ORIGINAL PROMPT' : '⚠️ NO ORIGINAL PROMPT';
      this.logs.push(`\n🏞️ Location: ${locationPrompt.name} (${locationPrompt.id})`);
      this.logs.push(`   Time: ${locationPrompt.timeOfDay || 'unspecified'}`);
      this.logs.push(`   Weather: ${locationPrompt.weather || 'unspecified'}`);
      this.logs.push(`   Status: ${hasOriginal}`);
      
      if (locationPrompt.fiboStructuredPrompt?.background_setting) {
        this.logs.push(`   Original Setting: ${truncate(locationPrompt.fiboStructuredPrompt.background_setting, 200)}`);
      }
    } else {
      this.logs.push('\n🏞️ Location: None specified');
    }
  }

  /**
   * Log an error
   */
  logError(context, error) {
    this.logs.push(formatSubHeader(`❌ ERROR: ${context}`));
    this.logs.push(`Message: ${error.message || error}`);
    if (error.stack) {
      this.logs.push(`\nStack trace:\n${error.stack}`);
    }
  }

  /**
   * Log session completion
   */
  logSessionEnd(result) {
    const duration = Date.now() - this.startTime;
    
    this.logs.push(formatHeader('🏁 SESSION COMPLETE', '═', 80));
    this.logs.push(`⏱️ Total Duration: ${(duration / 1000).toFixed(2)}s`);
    this.logs.push(`✅ Success: ${result?.success || false}`);
    
    if (result?.panels) {
      this.logs.push(`\n📊 Results Summary:`);
      this.logs.push(`   Total Panels: ${result.panels.length}`);
      const successful = result.panels.filter(p => p.imageUrl).length;
      const failed = result.panels.length - successful;
      this.logs.push(`   ✅ Successful: ${successful}`);
      this.logs.push(`   ❌ Failed: ${failed}`);
      
      this.logs.push(`\n🖼️ Generated Images:`);
      result.panels.forEach((p, i) => {
        if (p.imageUrl) {
          this.logs.push(`   Panel ${i + 1}: ${p.imageUrl}`);
        } else {
          this.logs.push(`   Panel ${i + 1}: FAILED - ${p.error || 'Unknown error'}`);
        }
      });
    }
    
    if (result?.error) {
      this.logs.push(`\n💥 Error: ${result.error}`);
    }
  }

  /**
   * Get all logs as a formatted string
   */
  toString() {
    return this.logs.join('\n');
  }

  /**
   * Save logs to file
   */
  async saveToFile(filename) {
    const logsDir = join(process.cwd(), 'logs');
    await mkdir(logsDir, { recursive: true });
    
    const filepath = join(logsDir, filename || `agent-session-${this.sessionId}.log`);
    await writeFile(filepath, this.toString(), 'utf-8');
    
    console.log(`📝 Detailed logs saved to: ${filepath}`);
    return filepath;
  }
}

/**
 * Create a new logger instance
 */
export function createLogger(sessionId) {
  return new AgentLogger(sessionId);
}

export default {
  AgentLogger,
  createLogger,
};
