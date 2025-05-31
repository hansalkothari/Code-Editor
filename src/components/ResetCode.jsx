import { Button } from "@chakra-ui/react";
import { CODE_SNIPPETS } from "../constants";

const ResetButton = ({ language, editorRef }) => {
  const resetCode = () => {
    if (editorRef.current) {
      const boilerplate = CODE_SNIPPETS[language] || "";
      editorRef.current.setValue(boilerplate);  
    }
  };

  return (
    <Button
      variant="outline"
      colorScheme="red"
      onClick={resetCode}
      ml={2} mb={4}
    >
      Reset Code
    </Button>
  );
};

export default ResetButton;
