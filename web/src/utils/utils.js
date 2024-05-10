export const PLANNING_PHRASE = 'PLAN';
export const EXECUTE_PHRASE = 'GO';
export const ADD_TO_DESIGN_PHRASE = 'ADD';

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

export function parseDesignDoc(inputText) {
  const stepHeaderPattern = /^##\s+\d+\.\s*(.*)$/;
  const sectionPattern = /^# (.*)$/;

  let steps = [];

  let lines = inputText.split('\n');
  let currentStep = null;
  let stepNumber = 0;
  let currentSection = '';

  lines.forEach(line => {
    const sectionMatch = line.match(sectionPattern);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      return; 
    }

    if (currentSection === 'Steps') {
      if (stepHeaderPattern.test(line)) {
        if (currentStep) {
          steps.push(currentStep);
        }
        stepNumber++;
        currentStep = {
          number: stepNumber,
          description: line.replace(stepHeaderPattern, '$1'),
          information: '',
        };
      } else if (currentStep) {
        currentStep.information += line.trim() + ' ';
      }
    }
  });

  if (currentStep) {
    steps.push(currentStep);
  }

  return steps;
}
