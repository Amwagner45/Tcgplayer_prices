import { useState, useCallback, useEffect, useRef } from "react";
import axios from "axios";

interface FetchStatus {
    status: string;
    progress: string;
    output: string[];
    started_at?: string;
    completed_at?: string;
    error?: string;
}

const API_BASE = "http://localhost:8000/api";

export function useFetchPrices() {
    const [status, setStatus] = useState<FetchStatus>({
        status: "idle",
        progress: "",
        output: [],
    });
    const [isLoading, setIsLoading] = useState(false);
    const pollIntervalRef = useRef<number | null>(null);

    // Poll for status updates
    const pollStatus = useCallback(async () => {
        try {
            const response = await axios.get<FetchStatus>(
                `${API_BASE}/scripts/fetch-prices/status`
            );
            setStatus(response.data);

            // Stop polling if completed or error
            if (
                response.data.status === "completed" ||
                response.data.status === "error"
            ) {
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                }
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Failed to poll fetch status:", error);
        }
    }, []);

    // Start fetch
    const startFetch = useCallback(async () => {
        setIsLoading(true);
        try {
            await axios.post(`${API_BASE}/scripts/fetch-prices/start`);

            // Start polling for status
            pollIntervalRef.current = window.setInterval(pollStatus, 1000);

            // Initial poll
            await pollStatus();
        } catch (error) {
            setIsLoading(false);
            console.error("Failed to start fetch:", error);
            if (axios.isAxiosError(error)) {
                setStatus({
                    status: "error",
                    progress: "",
                    output: [error.response?.data?.detail || error.message],
                    error: error.response?.data?.detail || error.message,
                });
            }
        }
    }, [pollStatus]);

    // Stop fetch
    const stopFetch = useCallback(async () => {
        try {
            await axios.post(`${API_BASE}/scripts/fetch-prices/stop`);
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            setIsLoading(false);
            await pollStatus();
        } catch (error) {
            console.error("Failed to stop fetch:", error);
        }
    }, [pollStatus]);

    // Reset status
    const resetStatus = useCallback(() => {
        setStatus({
            status: "idle",
            progress: "",
            output: [],
        });
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    return {
        status,
        isLoading,
        startFetch,
        stopFetch,
        resetStatus,
    };
}
