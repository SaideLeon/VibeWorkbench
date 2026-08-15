import { useState, useCallback } from 'react';
import { AnalysisMessage } from '@/types';
import { analyzeCode, thinkAndSuggest } from '@/services/ai';
import { limitTextContext } from '@/utils/textLimiter';
import { getResponseText } from '@/utils/ai-helpers';

export function useAIChat() {
  const [chatHistory, setChatHistory] = useState<AnalysisMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  
  // API Key Rotation State
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [keyIndex, setKeyIndex] = useState(0);

  const getNextKey = useCallback(() => {
    if (apiKeys.length > 0) {
      const key = apiKeys[keyIndex];
      setKeyIndex((prev) => (prev + 1) % apiKeys.length);
      return key;
    }
    return undefined;
  }, [apiKeys, keyIndex]);

  const handleKeyFileUpload = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const keys = text.split(/\r?\n/).map(k => k.trim()).filter(k => k.length > 20);
      
      if (keys.length === 0) {
        throw new Error("Nenhuma chave válida encontrada no arquivo.");
      }
      
      setApiKeys(keys);
      setKeyIndex(0);
      return keys.length;
    } catch (err) {
      console.error("Erro ao ler arquivo de chaves:", err);
      throw err;
    }
  }, []);

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
        })).filter((l: any): l is { title: string; url: string } => !!l.url) || []
      }]);
      
      return analysisText;
    } catch (error) {
      console.error("AI Analysis Error:", error);
      throw error;
    }
  }, [getNextKey]);

  const sendMessage = useCallback(async (msg: string) => {
    const newHistory = [...chatHistory, { role: 'user', content: msg, timestamp: Date.now() } as AnalysisMessage];
    setChatHistory(newHistory);
    setIsThinking(true);

    try {
      const activeKey = getNextKey();
      const response = await thinkAndSuggest(
        newHistory.map(h => ({ role: h.role, content: h.content })),
        msg,
        analysis || "Nenhum contexto disponível.",
        activeKey
      );

      const responseText = getResponseText(response);
      
      if (!responseText) {
         throw new Error("A resposta da IA veio vazia.");
      }
      
      const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
        title: c.web?.title || "Fonte",
        url: c.web?.uri
      })).filter((l: any): l is { title: string; url: string } => !!l.url) || [];

      setChatHistory(prev => [...prev, {
        role: 'model',
        content: responseText,
        timestamp: Date.now(),
        relatedLinks: links
      }]);
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
  }, [chatHistory, analysis, getNextKey]);

  return {
    chatHistory,
    isThinking,
    analysis,
    performInitialAnalysis,
    sendMessage,
    setChatHistory,
    // API Key Management
    apiKeys,
    keyIndex,
    handleKeyFileUpload
  };
}
