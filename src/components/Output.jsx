// Output.jsx
import { useRef, useState } from "react";
import { Box, Button, Text, useToast, VStack } from "@chakra-ui/react";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";

const Output = ({ editorRef }) => {
  const toast = useToast();
  const terminalRef = useRef(null);
  const xterm = useRef(null);
  const socketRef = useRef(null);
  const inputBuffer = useRef("");
  const [isRunning, setIsRunning] = useState(false);

  const runInteractive = () => {
    const code = editorRef.current.getValue();
    if (!code) return;

    // 1) Clean up any previous terminal or socket
    if (xterm.current) {
      xterm.current.dispose();
      xterm.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    // 2) Initialize xterm.js
    xterm.current = new Terminal({
      cols: 80,
      rows: 24,
      theme: {
        background: "#1e1e1e",
        foreground: "#ffffff",
      },
      fontFamily: "monospace",
      fontSize: 14,
      cursorBlink: true,
    });

    xterm.current.open(terminalRef.current);

    // Sometimes React needs a tick before focus works
    setTimeout(() => {
      if (xterm.current) {
        xterm.current.focus();
      }
    }, 0);

    // 3) Open WebSocket connection
    const ws = new WebSocket("ws://localhost:8000/ws/terminal");
    socketRef.current = ws;
    setIsRunning(true);

    ws.onopen = () => {
      // Send the Python code immediately
      ws.send(code);

      // Immediately focus so you can begin typing
      xterm.current.focus();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, payload } = msg;

        if (type === "stdout") {
          // Write exactly what Python printed (including the input prompt)
          xterm.current.write(payload);
        } else if (type === "stderr") {
          xterm.current.write(`\x1b[31m${payload}\x1b[0m`);
        } else if (type === "done") {
          xterm.current.write(`\r\n${payload}`);
          setIsRunning(false);
          ws.close();
        } else if (type === "error") {
          xterm.current.write(`\x1b[31m${payload}\x1b[0m\r\n`);
          setIsRunning(false);
          ws.close();
        }
      } catch {
        // If parsing fails, just write raw data
        xterm.current.write(event.data);
      }

      // After Python writes something (e.g. a new prompt), re‐focus so typing goes through
      setTimeout(() => {
        if (xterm.current) xterm.current.focus();
      }, 0);
    };

    ws.onerror = () => {
      toast({
        title: "Connection error",
        description:
          "WebSocket connection failed. Ensure backend is running with uvicorn[standard].",
        status: "error",
        duration: 6000,
      });
      setIsRunning(false);
    };

    ws.onclose = () => {
      setIsRunning(false);
    };

    // 4) Capture keystrokes, echo them locally, and forward to Python’s stdin
    xterm.current.onKey((ev) => {
      const { key } = ev;

      if (key === "\r") {
        // Enter key pressed
        xterm.current.write("\r\n");
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(inputBuffer.current + "\n");  // Send complete line to stdin
        }
        inputBuffer.current = "";  // Clear buffer
      } else if (key === "\u007f") {
        // Handle backspace
        if (inputBuffer.current.length > 0) {
          inputBuffer.current = inputBuffer.current.slice(0, -1);
          xterm.current.write("\b \b");
        }
      } else {
        xterm.current.write(key);
        inputBuffer.current += key;
      }
    });
  };

  return (
    <Box w="50%">
      <VStack align="stretch" spacing={4}>
        <Text fontSize="lg">Interactive Terminal</Text>

        <Button
          variant="outline"
          colorScheme="green"
          isDisabled={isRunning}
          onClick={runInteractive}
        >
          Run Code (Interactive)
        </Button>

        <Box
          ref={terminalRef}
          flexGrow={1}
          border="1px solid #333"
          borderRadius="4px"
          height="75vh"
          overflow="hidden"
          bg="#1e1e1e"
          tabIndex={0} // make sure the box can be focused
          onClick={() => {
            if (xterm.current) {
              xterm.current.focus();
            }
          }}
        ></Box>
      </VStack>
    </Box>
  );
};

export default Output;
