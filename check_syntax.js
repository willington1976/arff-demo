
const fs = require('fs');
const content = fs.readFileSync('C:/Users/Willington/Documents/ARFF-DEMO/arff_area_critica.html', 'utf8');
const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/g);
if (scriptMatch) {
  scriptMatch.forEach((script, i) => {
    const code = script.replace(/<script>|<\/script>/g, '');
    try {
      new Function(code);
      console.log(`Script ${i} is valid`);
    } catch (e) {
      console.error(`Script ${i} has error: ${e.message}`);
      console.log('Code around error:');
      const lines = code.split('\n');
      const errorLine = e.stack.match(/<anonymous>:(\d+):/);
      if (errorLine) {
        const lineNum = parseInt(errorLine[1]);
        for (let j = Math.max(0, lineNum - 5); j < Math.min(lines.length, lineNum + 5); j++) {
          console.log(`${j+1}: ${lines[j]}`);
        }
      }
    }
  });
} else {
  console.log('No scripts found');
}
