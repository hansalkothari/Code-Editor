import { useRef, useState } from "react";
import {
  Box,
  Button,
  Text,
  Textarea,
  useToast,
  VStack,
} from "@chakra-ui/react";

const Output = ({ editorRef }) => {
  const toast = useToast();
  const [stdin, setStdin] = useState("");
  const [outputLines, setOutputLines] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const runCode = async () => {
    const sourceCode = editorRef.current.getValue();
    if (!sourceCode) return;

    setIsLoading(true);
    setIsError(false);
    setOutputLines(null);

    try {
      const response = await fetch("http://localhost:8000/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: sourceCode,
          stdin: stdin.endsWith("\n") ? stdin : stdin + "\n", // ensure newline
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // If there was an exception inside exec(), FastAPI returns error in data.error
        if (data.error && data.error.length > 0) {
          setIsError(true);
          // Show the traceback lines as “output”
          setOutputLines(data.error.split("\n"));
        } else {
          setIsError(false);
          setOutputLines(data.output.split("\n"));
        }
      } else {
        // HTTP 400 or 500
        setIsError(true);
        setOutputLines([
          `HTTP ${response.status}: ${data.detail || "Unknown error"}`,
        ]);
      }
    } catch (err) {
      setIsError(true);
      toast({
        title: "An error occurred.",
        description: err.message || "Unable to run code",
        status: "error",
        duration: 6000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box w="50%">
      <VStack align="stretch" spacing={4}>
        <Text fontSize="lg">Terminal</Text>

        {/* Textarea for stdin input */}
        <Box>
          <Text mb={2} fontSize="md">
            Input (stdin):
          </Text>
          <Textarea
            placeholder="Enter any input here (one per line)…"
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            resize="vertical"
            minH="100px"
            fontFamily="mono"
            fontSize="sm"
          />
        </Box>

        <Button
          variant="outline"
          colorScheme="green"
          isLoading={isLoading}
          onClick={runCode}
        >
          Run Code
        </Button>

        {/* Output box */}
        <Box
          flexGrow={1}
          p={2}
          fontFamily="mono"
          fontSize="sm"
          whiteSpace="pre-wrap"
          overflowY="auto"
          bg="#1e1e1e"
          color={isError ? "red.400" : "white"}
          border="1px solid"
          borderColor={isError ? "red.500" : "#333"}
          borderRadius="4px"
          minH="200px"
        >
          {/* If outputLines is null, show placeholder text */}
          {outputLines
            ? outputLines.map((line, idx) => <Text key={idx}>{line}</Text>)
            : 'If your code uses input(), type values above and click "Run Code".\nOutput will appear here.'}
        </Box>
      </VStack>
    </Box>
  );
};

export default Output;
