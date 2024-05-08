export function ellipses(text, maxChars = 5) {
  if (!text) return text;
  return text.length > maxChars ? `${text.substring(0, maxChars)}...` : text;
}

export function parseAndFormatMessageText(inputText) {
  const regex = /<b>(.*?)<\/b>/g;
  let parts = [];
  let lastIndex = 0;

  inputText.replace(regex, (match, p1, offset) => {
      if (offset > lastIndex) {
          parts.push(inputText.substring(lastIndex, offset));
      }
      parts.push(<strong key={offset}>{p1}</strong>);
      lastIndex = offset + match.length;
  });

  if (lastIndex < inputText.length) {
      parts.push(inputText.substring(lastIndex));
  }

  return parts;
}

export function parseDesignDocIntoSteps(docText) {
  const stepRegex = /(\d+)\.\s(.*?)(?=(\d+\.\s|$))/gs;
  const fileRegex = /file:\/\/\/[^ \n]+/g;
  const extraInfoRegex = /(This is.*?)(Files:|$)/s;

  const steps = [];
  let match;

  while ((match = stepRegex.exec(docText)) !== null) {
      const stepNumber = parseInt(match[1], 10);
      const stepContent = match[2].trim();
      
      let files = stepContent.match(fileRegex);
      const infoMatch = extraInfoRegex.exec(stepContent);
      const information = infoMatch ? infoMatch[1].trim() : "";

      const descriptionEndIndex = stepContent.indexOf('Files:') >= 0 ? stepContent.indexOf('Files:') : stepContent.length;
      const description = stepContent.substring(0, descriptionEndIndex).split('\n')[0].trim();

      steps.push({
        number: stepNumber,
        description: description,
        files: files,
        information: information
      });
  }

  return steps;
}