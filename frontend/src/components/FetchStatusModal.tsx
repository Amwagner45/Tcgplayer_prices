import { useEffect, useRef } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    LinearProgress,
    Typography,
    Paper,
    CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import RefreshIcon from "@mui/icons-material/Refresh";

interface FetchStatusModalProps {
    open: boolean;
    status: string;
    progress: string;
    output: string[];
    error?: string;
    onClose: () => void;
    onStop: () => void;
}

export default function FetchStatusModal({
    open,
    status,
    progress,
    output,
    error,
    onClose,
    onStop,
}: FetchStatusModalProps) {
    const outputEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new output arrives
    useEffect(() => {
        outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [output]);

    const isRunning = status === "running";
    const isCompleted = status === "completed";
    const hasError = status === "error" || error;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    maxHeight: "80vh",
                    display: "flex",
                    flexDirection: "column",
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    pb: 1,
                }}
            >
                {isRunning && <RefreshIcon sx={{ animation: "spin 1s linear infinite" }} />}
                {isCompleted && (
                    <CheckCircleIcon sx={{ color: "success.main" }} />
                )}
                {hasError && <ErrorIcon sx={{ color: "error.main" }} />}
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h6">
                        Fetch Prices
                        {isRunning && " (Running...)"}
                        {isCompleted && " (Completed)"}
                        {hasError && " (Error)"}
                    </Typography>
                </Box>
            </DialogTitle>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>

            {isRunning && <LinearProgress />}

            <DialogContent
                sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    py: 2,
                }}
            >
                {/* Current status */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                        Status:
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            p: 1,
                            bgcolor: "action.hover",
                            borderRadius: 1,
                            wordBreak: "break-word",
                            fontFamily: "monospace",
                            fontSize: "0.85rem",
                        }}
                    >
                        {progress || "Initializing..."}
                    </Typography>
                </Box>

                {/* Error message */}
                {error && (
                    <Box
                        sx={{
                            mb: 2,
                            p: 1.5,
                            bgcolor: "error.light",
                            color: "error.dark",
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "error.main",
                        }}
                    >
                        <Typography variant="body2">
                            <strong>Error:</strong> {error}
                        </Typography>
                    </Box>
                )}

                {/* Output log */}
                <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                        Log Output ({output.length} lines):
                    </Typography>
                </Box>

                <Paper
                    variant="outlined"
                    sx={{
                        flex: 1,
                        overflow: "auto",
                        p: 1.5,
                        bgcolor: "#1a1a2e",
                        color: "#00ff00",
                        fontFamily: "monospace",
                        fontSize: "0.8rem",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                    }}
                >
                    {output.length === 0 ? (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                height: "100%",
                                color: "rgba(0, 255, 0, 0.3)",
                            }}
                        >
                            <CircularProgress size={24} sx={{ mr: 1 }} />
                            Waiting for output...
                        </Box>
                    ) : (
                        <>
                            {output.map((line, i) => (
                                <div key={i}>{line}</div>
                            ))}
                            <div ref={outputEndRef} />
                        </>
                    )}
                </Paper>
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1 }}>
                {isRunning && (
                    <Button onClick={onStop} color="error" variant="outlined">
                        Stop
                    </Button>
                )}
                <Button
                    onClick={onClose}
                    color="primary"
                    variant="contained"
                    disabled={isRunning}
                >
                    {isRunning ? "Fetching..." : "Close"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
