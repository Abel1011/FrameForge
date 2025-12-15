/**
 * Azure OpenAI Configuration for Agents SDK
 * 
 * Uses AzureOpenAI client with OpenAIResponsesModel for proper Azure integration.
 * Reference: https://github.com/openai/openai-agents-js
 */

import { AzureOpenAI } from 'openai';
import { setDefaultOpenAIClient } from '@openai/agents';

// Azure OpenAI configuration - matching generate-settings/route.js
export const AZURE_CONFIG = {
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2025-04-01-preview',
  deployment: 'gpt-5.1', // Same model as generate-settings
};

// Singleton client instance
let azureClientInstance = null;

/**
 * Create an Azure OpenAI client
 * @returns {AzureOpenAI} Configured Azure client instance
 */
export function createAzureClient() {
  if (azureClientInstance) {
    return azureClientInstance;
  }

  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;

  if (!apiKey || !endpoint) {
    throw new Error('Azure OpenAI credentials not configured. Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT.');
  }

  azureClientInstance = new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion: AZURE_CONFIG.apiVersion,
  });

  // Set as the default client for the Agents SDK
  setDefaultOpenAIClient(azureClientInstance);

  return azureClientInstance;
}

/**
 * Initialize Azure OpenAI for the Agents SDK
 * Call this once at startup to set the default client
 */
export function initializeAzureOpenAI() {
  return createAzureClient();
}

/**
 * Get the deployment/model name for agents
 * @returns {string} Model name to use
 */
export function getModelName() {
  return AZURE_CONFIG.deployment;
}

export default {
  createAzureClient,
  initializeAzureOpenAI,
  getModelName,
  AZURE_CONFIG,
};
