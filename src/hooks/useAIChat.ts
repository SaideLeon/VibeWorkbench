import { useState, useCallback, useEffect } from 'react';
import { AnalysisMessage } from '@/types';
import { analyzeCode, thinkAndSuggest, ThinkOptions } from '@/services/ai';
import { runHarnessAgent } from '@/services/agent';
import { limitTextContext } from '@/utils/textLimiter';
import { getResponseText } from '@/utils/ai-helpers';

const STORAGE_KEYS_NAME = 'gemini_user_api_keys';
const STORAGE_INDEX_NAME = 'gemini_user_key_index';
const STORAGE_HARNESS_MODE = 'deepseek_harness_mode_active';

export interface SendMessageOptions {
  relevantFiles?: { path: string; content: string }[];
  repoName?: string;
  treeOverview?: string[];
  activeFile?: string;
  retrievalSummary?: string;
  forceHarness?: boolean;
}

export function useAIChat() {
  const [chatHistory, setChatHistory] = useState<AnalysisMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isHarnessMode, setIsHarnessMode] = useState(true);
  
  // API Key Rotation & Prioritization State
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [keyIndex, setKeyIndex] = useState(0);

  // Initialize keys from localStorage on mount
  useEffect(() => {
    try {
      const savedKeys = localStorage.getItem(STORAGE_KEYS_NAME);
      const savedIndex = localStorage.getItem(STORAGE_INDEX_NAME);
      const savedHarnessMode = localStorage.getItem(STORAGE_HARNESS_MODE);
      if (savedHarnessMode !== null) {
        setIsHarnessMode(savedHarnessMode === 'true');
      }
      if (savedKeys) {
        const parsed = JSON.parse(savedKeys);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((k: any) => typeof k === 'string' && k.trim().length > 10);
          setApiKeys(valid);
          if (savedIndex) {
            const idx = parseInt(savedIndex, 10);
            if (!isNaN(idx) && idx >= 0 && idx < valid.length) {
              setKeyIndex(idx);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar chaves do localStorage:', e);
    }
  }, []);

  const toggleHarnessMode = useCallback(() => {
    setIsHarnessMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_HARNESS_MODE, String(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });
  }, []);

  const saveKeys = useCallback((keys: string[], activeIdx = 0) => {
    setApiKeys(keys);
    const validIdx = keys.length > 0 ? Math.min(activeIdx, keys.length - 1) : 0;
    setKeyIndex(validIdx);
    try {
      localStorage.setItem(STORAGE_KEYS_NAME, JSON.stringify(keys));
      localStorage.setItem(STORAGE_INDEX_NAME, String(validIdx));
    } catch (e) {
      console.warn('Erro ao salvar chaves no localStorage:', e);
    }
  }, []);

  const addApiKeys = useCallback((newKeysInput: string[] | string) => {
    const rawList = Array.isArray(newKeysInput) 
      ? newKeysInput 
      : newKeysInput.split(/[\r\n,;]+/).map(k => k.trim());
    
    const validNew = rawList
      .map(k => k.trim())
      .filter(k => k.length > 15);

    if (validNew.length === 0) {
      throw new Error('Nenhuma chave de API válida encontrada. Verifique o formato inserido.');
    }

    setApiKeys(prev => {
      const existing = new Set(prev);
      const merged = [...prev];
      for (const k of validNew) {
        if (!existing.has(k)) {
          merged.push(k);
          existing.add(k);
        }
      }
      try {
        localStorage.setItem(STORAGE_KEYS_NAME, JSON.stringify(merged));
      } catch (e) {
        console.warn(e);
      }
      return merged;
    });

    return validNew.length;
  }, []);

  const removeApiKey = useCallback((indexToRemove: number) => {
    setApiKeys(prev => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      const nextIdx = updated.length > 0 ? 0 : 0;
      setKeyIndex(nextIdx);
      try {
        localStorage.setItem(STORAGE_KEYS_NAME, JSON.stringify(updated));
        localStorage.setItem(STORAGE_INDEX_NAME, String(nextIdx));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  }, []);

  const clearApiKeys = useCallback(() => {
    setApiKeys([]);
    setKeyIndex(0);
    try {
      localStorage.removeItem(STORAGE_KEYS_NAME);
      localStorage.removeItem(STORAGE_INDEX_NAME);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const setActiveKeyIndex = useCallback((idx: number) => {
    if (idx >= 0 && idx < apiKeys.length) {
      setKeyIndex(idx);
      try {
        localStorage.setItem(STORAGE_INDEX_NAME, String(idx));
      } catch (e) {
        console.warn(e);
      }
    }
  }, [apiKeys.length]);

  const getActiveKey = useCallback(() => {
    if (apiKeys.length > 0 && keyIndex < apiKeys.length) {
      return apiKeys[keyIndex];
    }
    return undefined;
  }, [apiKeys, keyIndex]);

  const getNextKey = useCallback(() => {
    if (apiKeys.length > 0) {
      const key = apiKeys[keyIndex];
      const nextIndex = (keyIndex + 1) % apiKeys.length;
      setKeyIndex(nextIndex);
      try {
        localStorage.setItem(STORAGE_INDEX_NAME, String(nextIndex));
      } catch (e) {
        console.warn(e);
      }
      return key;
    }
    return undefined;
  }, [apiKeys, keyIndex]);

  const handleKeyFileUpload = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const keys = text.split(/\r?\n/).map(k => k.trim()).filter(k => k.length > 15);
      
      if (keys.length === 0) {
        throw new Error("Nenhuma chave válida encontrada no arquivo.");
      }
      
      saveKeys(keys, 0);
      return keys.length;
    } catch (err) {
      console.error("Erro ao ler arquivo de chaves:", err);
      throw err;
    }
  }, [saveKeys]);

  const performInitialAnalysis = useCallback(async (files: { path: string, content: string }[]) => {
    try {
      const activeKey = getNextKey();
      
      // Apply text limiter to file contents before sending to AI
      const limitedFiles = files.map(f => ({
        path: f.path,
        content: limitTextContext(f.content)
      }));

      const aiRes = await analyzeCode(limitedFiles, undefined, activeKey);
      const analysisText = getResponseText(aiRes);
      
      if (!analysisText) {
        throw new Error("A resposta da IA veio vazia. Verifique os logs do servidor.");
      }
      
      setAnalysis(analysisText);
      setChatHistory([{
        role: 'model',
        content: analysisText,
        timestamp: Date.now(),
        relatedLinks: aiRes.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
             title: c.web?.title || "Fonte",
             url: c.web?.uri
        })).filter((l: any): l is { title: string; url: string } => !!l.url) || [],
        referencedFiles: files.map(f => f.path)
      }]);
      
      return analysisText;
    } catch (error) {
      console.error("AI Analysis Error:", error);
      throw error;
    }
  }, [getNextKey]);

  const sendMessage = useCallback(async (msg: string, options?: SendMessageOptions) => {
    const newHistory = [...chatHistory, { role: 'user', content: msg, timestamp: Date.now() } as AnalysisMessage];
    setChatHistory(newHistory);
    setIsThinking(true);

    try {
      const activeKey = getNextKey();
      const useHarness = options?.forceHarness ?? isHarnessMode;

      // Apply text limiting to relevant files to guarantee we stay comfortably within token budgets
      const limitedRelevantFiles = options?.relevantFiles?.map(f => ({
        path: f.path,
        content: limitTextContext(f.content, 50000)
      })) || [];

      if (useHarness) {
        // DeepSeek-Harness Autonomous Agent Workflow
        const agentRes = await runHarnessAgent({
          userGoal: msg,
          files: limitedRelevantFiles,
          repoName: options?.repoName,
          activeFile: options?.activeFile,
          treeOverview: options?.treeOverview,
          apiKey: activeKey,
          maxIterations: 5,
        });

        const consultedSet = new Set<string>();
        if (options?.relevantFiles) {
          options.relevantFiles.forEach(f => consultedSet.add(f.path));
        }

        setChatHistory(prev => [...prev, {
          role: 'model',
          content: agentRes.finalAnswer,
          timestamp: Date.now(),
          referencedFiles: Array.from(consultedSet),
          agentTraces: agentRes.traces,
          toolsUsed: agentRes.toolsUsed,
          isHarnessRun: true,
          generatedPatches: agentRes.generatedPatches,
          retrievalSummary: options?.retrievalSummary || `DeepSeek-Harness (${agentRes.toolsUsed.length} ferramentas acionadas em ${agentRes.iterations} passos)`
        }]);
      } else {
        // Standard Lead Engineer LLM Thinking
        const thinkOptions: ThinkOptions = {
          apiKey: activeKey,
          relevantFiles: limitedRelevantFiles,
          repoName: options?.repoName,
          treeOverview: options?.treeOverview,
          activeFile: options?.activeFile
        };

        const response = await thinkAndSuggest(
          newHistory.map(h => ({ role: h.role, content: h.content })),
          msg,
          analysis || "Nenhum contexto prévio disponível.",
          thinkOptions
        );

        const responseText = getResponseText(response);
        
        if (!responseText) {
          throw new Error("A resposta da IA veio vazia.");
        }
        
        const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
          title: c.web?.title || "Fonte",
          url: c.web?.uri
        })).filter((l: any): l is { title: string; url: string } => !!l.url) || [];

        const consultedSet = new Set<string>();
        if (options?.relevantFiles) {
          options.relevantFiles.forEach(f => consultedSet.add(f.path));
        }

        setChatHistory(prev => [...prev, {
          role: 'model',
          content: responseText,
          timestamp: Date.now(),
          relatedLinks: links,
          referencedFiles: Array.from(consultedSet),
          retrievalSummary: options?.retrievalSummary
        }]);
      }
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, {
        role: 'model',
        content: `Erro: ${err instanceof Error ? err.message : "Erro desconhecido ao processar resposta."}`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsThinking(false);
    }
  }, [chatHistory, analysis, getNextKey, isHarnessMode]);

  return {
    chatHistory,
    isThinking,
    analysis,
    isHarnessMode,
    toggleHarnessMode,
    performInitialAnalysis,
    sendMessage,
    setChatHistory,
    // API Key Management & Prioritization
    apiKeys,
    keyIndex,
    getActiveKey,
    getNextKey,
    addApiKeys,
    removeApiKey,
    clearApiKeys,
    setActiveKeyIndex,
    handleKeyFileUpload
  };
}
