# Quaere

**A fast, secure, and precise way to analyze your PDF documents.**

Quaere is a powerful web application designed to help you interact with your PDF documents like never before. Powered by Google's Gemini API, this tool allows you to upload a PDF, extract its content, and engage in an intelligent conversation to find the information you need, quickly and accurately.

## Key Features

-   **🚀 Fast & Efficient:** The entire analysis process, from text extraction to rendering, is optimized for speed, giving you instant access to your document's content.
-   **🔒 Secure & Private:** Your privacy is paramount. All processing, including PDF rendering and text extraction, happens entirely within your browser. Your documents are **never** uploaded to any server, ensuring your data remains confidential.
-   **🎯 Precise AI-Powered Chat:** Ask complex questions in natural language. The AI assistant, powered by Gemini, provides answers based *exclusively* on the content of your document, eliminating guesswork and external information.
-   **✍️ Interactive Form Filling:** Tell the AI to fill out a form (e.g., "Fill in my name as John Doe and my address as 123 Main St"), and it will intelligently identify the correct fields and place the text for you.
-   **🔍 Source Highlighting:** Never lose track of where information comes from. When the AI cites a piece of text from the document, you can click to instantly highlight the exact passage on the PDF page, verifying the source with a single click.

## How It Works

1.  **Upload:** Select any PDF file from your local computer.
2.  **Analyze:** The application uses `pdf.js` to render the document and extract all text and its coordinates directly in your browser.
3.  **Chat:** The extracted text is then passed as context to the Gemini model. You can ask questions, request summaries, or ask it to fill in form fields. The model uses its advanced understanding and function calling capabilities to respond accurately and perform actions on the document.

## Technology Stack

-   **Frontend:** React, TypeScript
-   **Styling:** Tailwind CSS
-   **PDF Processing:** [PDF.js](https://mozilla.github.io/pdf.js/)
-   **AI Language Model:** [Google Gemini API](https://ai.google.dev/) (`@google/genai`)
