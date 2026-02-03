"use client";

import { useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFirebase } from "@/components/FirebaseProvider";
import {
  getSystemSettings,
  updateSystemSettings,
  subscribeToSettings,
  resetSystemSettings,
} from "@/lib/settingsService";
import { useSettingsStore } from "@/stores/settingsStore";
import type { SystemSettings, SystemSettingsInput } from "@/types/settings";

const SETTINGS_QUERY_KEY = ["system-settings"] as const;

/**
 * 시스템 설정 조회/수정 훅
 */
export function useSystemSettings() {
  const { status } = useFirebase();
  const queryClient = useQueryClient();

  const {
    settings: localSettings,
    setSettings,
    setLoading,
    setSaving,
    setError,
    isLoading: storeLoading,
    isSaving,
    error,
    hasUnsavedChanges,
    setHasUnsavedChanges,
  } = useSettingsStore();

  // 설정 조회 쿼리
  const {
    data: remoteSettings,
    isLoading: queryLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: getSystemSettings,
    enabled: status === "ready",
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 30, // 30분
  });

  // 원격 설정이 로드되면 스토어에 반영
  useEffect(() => {
    if (remoteSettings && !hasUnsavedChanges) {
      setSettings(remoteSettings);
    }
  }, [remoteSettings, setSettings, hasUnsavedChanges]);

  // 로딩 상태 동기화
  useEffect(() => {
    setLoading(queryLoading || status !== "ready");
  }, [queryLoading, status, setLoading]);

  // 에러 상태 동기화
  useEffect(() => {
    if (queryError) {
      setError(queryError instanceof Error ? queryError.message : "설정 로드 실패");
    }
  }, [queryError, setError]);

  // 실시간 구독 (선택적)
  useEffect(() => {
    if (status !== "ready") return;

    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      unsubscribe = await subscribeToSettings((settings) => {
        // 실시간 업데이트 수신 시 캐시 갱신
        queryClient.setQueryData(SETTINGS_QUERY_KEY, settings);
        if (!hasUnsavedChanges) {
          setSettings(settings);
        }
      });
    };

    setupSubscription();

    return () => {
      unsubscribe?.();
    };
  }, [status, queryClient, setSettings, hasUnsavedChanges]);

  // 설정 저장 뮤테이션
  const saveMutation = useMutation({
    mutationFn: (input: SystemSettingsInput) => updateSystemSettings(input),
    onMutate: () => {
      setSaving(true);
      setError(null);
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      // 캐시 무효화 및 재조회
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "설정 저장 실패");
    },
    onSettled: () => {
      setSaving(false);
    },
  });

  // 전체 설정 저장
  const saveSettings = useCallback(async () => {
    await saveMutation.mutateAsync(localSettings);
  }, [saveMutation, localSettings]);

  // 특정 섹션만 저장
  const saveSection = useCallback(
    async (section: keyof SystemSettings) => {
      const sectionData = localSettings[section];
      if (!sectionData) return;

      await saveMutation.mutateAsync({ [section]: sectionData });
    },
    [saveMutation, localSettings]
  );

  // 원격 설정으로 롤백
  const discardChanges = useCallback(() => {
    if (remoteSettings) {
      setSettings(remoteSettings);
    }
  }, [remoteSettings, setSettings]);

  // 설정 초기화 (기본값으로 리셋)
  const resetSettings = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      await resetSystemSettings();
      // 캐시 무효화 및 재조회
      await queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
      await refetch();
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "설정 초기화 실패");
    } finally {
      setSaving(false);
    }
  }, [queryClient, refetch, setSaving, setError, setHasUnsavedChanges]);

  return {
    // 상태
    settings: localSettings,
    remoteSettings,
    isLoading: storeLoading || queryLoading,
    isSaving,
    error,
    hasUnsavedChanges,

    // 액션
    saveSettings,
    saveSection,
    discardChanges,
    resetSettings,
    refetch,
  };
}

/**
 * 설정 유효성 검증 훅
 */
export function useSettingsValidation() {
  const { settings } = useSettingsStore();

  const validateAutomation = useCallback(() => {
    const errors: string[] = [];
    const { automation } = settings;

    if (automation.maxProductsPerRun < 1 || automation.maxProductsPerRun > 100) {
      errors.push("1회 최대 수집 상품 수는 1~100 사이여야 합니다.");
    }

    const scheduleRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!scheduleRegex.test(automation.collectSchedule)) {
      errors.push("수집 스케줄 형식이 올바르지 않습니다. (HH:mm)");
    }

    return errors;
  }, [settings]);

  const validateAI = useCallback(() => {
    const errors: string[] = [];
    const { ai } = settings;

    if (ai.temperature < 0 || ai.temperature > 2) {
      errors.push("Temperature는 0~2 사이여야 합니다.");
    }

    if (ai.maxTokens < 100 || ai.maxTokens > 8192) {
      errors.push("Max Tokens는 100~8192 사이여야 합니다.");
    }

    // 선택된 제공자의 API 키 확인 (경고 수준)
    const providerConfig = ai[ai.defaultProvider];
    if (!providerConfig.apiKey) {
      errors.push(`(권장) ${ai.defaultProvider} API 키가 설정되지 않았습니다.`);
    }

    return errors;
  }, [settings]);

  const validatePrompt = useCallback(() => {
    const errors: string[] = [];
    const { prompt } = settings;

    if (prompt.minLength < 10 || prompt.minLength > 500) {
      errors.push("최소 글자 수는 10~500 사이여야 합니다.");
    }

    if (prompt.maxLength < prompt.minLength || prompt.maxLength > 2000) {
      errors.push("최대 글자 수는 최소값보다 크고 2000 이하여야 합니다.");
    }

    if (prompt.toneScoreThreshold < 0 || prompt.toneScoreThreshold > 1) {
      errors.push("톤 점수 임계값은 0~1 사이여야 합니다.");
    }

    if (!prompt.systemPrompt.trim()) {
      errors.push("시스템 프롬프트를 입력해주세요.");
    }

    if (!prompt.reviewTemplate.trim()) {
      errors.push("리뷰 템플릿을 입력해주세요.");
    }

    return errors;
  }, [settings]);

  const validateCoupang = useCallback(() => {
    const errors: string[] = [];
    const { coupang } = settings;

    // 활성화된 경우에만 필수 항목 체크 (경고 수준)
    if (coupang.enabled) {
      if (!coupang.accessKey) {
        errors.push("(권장) 쿠팡 Access Key를 입력해주세요.");
      }
      if (!coupang.secretKey) {
        errors.push("(권장) 쿠팡 Secret Key를 입력해주세요.");
      }
      if (!coupang.partnerId) {
        errors.push("(권장) 쿠팡 Partner ID를 입력해주세요.");
      }
    }

    return errors;
  }, [settings]);

  const validateAll = useCallback(() => {
    return [
      ...validateAutomation(),
      ...validateAI(),
      ...validatePrompt(),
      ...validateCoupang(),
    ];
  }, [validateAutomation, validateAI, validatePrompt, validateCoupang]);

  return {
    validateAutomation,
    validateAI,
    validatePrompt,
    validateCoupang,
    validateAll,
  };
}

/**
 * 쿠팡 API 연결 테스트 훅
 */
export function useCoupangConnectionTest() {
  const { settings } = useSettingsStore();

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/settings/coupang/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessKey: settings.coupang.accessKey,
          secretKey: settings.coupang.secretKey,
          partnerId: settings.coupang.partnerId,
        }),
      });

      if (!response.ok) {
        throw new Error("연결 테스트 실패");
      }

      return response.json();
    },
  });

  return {
    testConnection: testMutation.mutate,
    isTestingConnection: testMutation.isPending,
    testResult: testMutation.data,
    testError: testMutation.error,
    resetTest: testMutation.reset,
  };
}
