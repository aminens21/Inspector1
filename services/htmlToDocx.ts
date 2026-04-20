import HTMLtoDOCX from 'html-to-docx';

export async function convertHtmlToDocx(htmlString: string, options: any = {}): Promise<Blob> {
  // Return HTML as a Blob with application/msword type
  // This will make Word open it in Web Layout mode, which is what the user requested
  
  // Add a meta tag to ensure UTF-8 encoding is recognized by Word if not present
  let htmlWithMeta = htmlString;
  if (!htmlString.match(/<meta[^>]*charset/i)) {
    if (htmlString.includes('<head>')) {
      htmlWithMeta = htmlString.replace('<head>', '<head>\n<meta charset="utf-8">\n');
    } else if (htmlString.includes('<html>')) {
      htmlWithMeta = htmlString.replace('<html>', '<html>\n<head>\n<meta charset="utf-8">\n</head>\n');
    } else {
      htmlWithMeta = `<html>\n<head>\n<meta charset="utf-8">\n</head>\n<body>\n${htmlString}\n</body>\n</html>`;
    }
  }
    
  return new Blob(['\ufeff', htmlWithMeta], { type: 'application/msword' });
}
