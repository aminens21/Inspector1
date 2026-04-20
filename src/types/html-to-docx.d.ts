declare module 'html-to-docx' {
  export default function HTMLtoDOCX(
    htmlString: string,
    headerHTML?: string | null,
    documentOptions?: any,
    footerHTML?: string | null
  ): Promise<Buffer | Blob>;
}
