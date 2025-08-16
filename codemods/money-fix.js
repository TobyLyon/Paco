/**
 * 🔧 JSCodeshift Money Arithmetic Fixer
 * 
 * Automatically fixes dangerous money patterns:
 * - parseFloat(x) * 1e18 → toWei(x)  
 * - Number(wei) / 1e18 → Number(fromWei(wei))
 * - fee calculations → percentMul()
 * - Ensures proper imports
 */

const IMPORT_SPEC = [
  'toWei', 'fromWei', 'wadMul', 'percentMul', 'weiToString', 'stringToWei'
];

const UI_IMPORT_SPEC = [
  'parseEthInputOrThrow', 'displayEth', 'toJsonWei', 'fromJsonWei'
];

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  console.log(`🔧 Processing: ${file.path}`);

  // Check if this is a frontend file
  const isFrontend = file.path.includes('frontend') || file.path.includes('client');

  // Ensure imports are present
  const ensureImports = () => {
    const hasMoneyImport = root.find(j.ImportDeclaration, { 
      source: { value: '../../src/lib/money' } 
    }).size() > 0 || root.find(j.ImportDeclaration, { 
      source: { value: '@/lib/money' } 
    }).size() > 0;

    const hasUIImport = root.find(j.ImportDeclaration, { 
      source: { value: '../../src/lib/money-ui' } 
    }).size() > 0 || root.find(j.ImportDeclaration, { 
      source: { value: '@/lib/money-ui' } 
    }).size() > 0;

    if (!hasMoneyImport) {
      const importPath = isFrontend ? '../../src/lib/money' : '@/lib/money';
      const imp = j.importDeclaration(
        IMPORT_SPEC.map(n => j.importSpecifier(j.identifier(n))),
        j.literal(importPath)
      );
      
      // Add at the top of the file
      const firstImport = root.find(j.ImportDeclaration).at(0);
      if (firstImport.length > 0) {
        firstImport.insertBefore(imp);
      } else {
        root.get().node.program.body.unshift(imp);
      }
    }

    if (isFrontend && !hasUIImport) {
      const imp = j.importDeclaration(
        UI_IMPORT_SPEC.map(n => j.importSpecifier(j.identifier(n))),
        j.literal('../../src/lib/money-ui')
      );
      
      const lastImport = root.find(j.ImportDeclaration).at(-1);
      if (lastImport.length > 0) {
        lastImport.insertAfter(imp);
      } else {
        root.get().node.program.body.unshift(imp);
      }
    }
  };

  // Helper to detect 1e18 patterns
  const isOneE18 = n =>
    (n.type === 'Literal' && (String(n.value) === '1e18' || n.value === 1e18)) ||
    (n.type === 'Identifier' && /1e18/.test(n.name));

  // Helper to detect money-related variables
  const isMoneyVariable = name => 
    /balance|amount|wei|eth|value|deposit|withdraw|bet|payout|price/i.test(name);

  let transformCount = 0;

  // 1. Fix: parseFloat(x) * 1e18 OR Number(x) * 1e18 → toWei(x)
  root.find(j.BinaryExpression, { operator: '*' })
    .filter(p => isOneE18(p.node.right))
    .forEach(p => {
      const L = p.node.left;
      if (L.type === 'CallExpression' && L.callee.type === 'Identifier' &&
          (L.callee.name === 'parseFloat' || L.callee.name === 'Number')) {
        const arg = L.arguments[0] || j.literal('0');
        j(p).replaceWith(j.callExpression(j.identifier('toWei'), [arg]));
        transformCount++;
        console.log(`  ✅ Fixed: ${L.callee.name}(...) * 1e18 → toWei(...)`);
      }
    });

  // 2. Fix: Number(weiLike) / 1e18 → Number(fromWei(weiLike))
  root.find(j.BinaryExpression, { operator: '/' })
    .filter(p => isOneE18(p.node.right))
    .forEach(p => {
      const L = p.node.left;
      if (L.type === 'CallExpression' && L.callee.type === 'Identifier' && L.callee.name === 'Number') {
        const arg = L.arguments[0] || j.identifier('0');
        j(p).replaceWith(
          j.callExpression(j.identifier('Number'), [
            j.callExpression(j.identifier('fromWei'), [arg])
          ])
        );
        transformCount++;
        console.log(`  ✅ Fixed: Number(...) / 1e18 → Number(fromWei(...))`);
      }
    });

  // 3. Fix: (Number(wei)/1e18).toFixed(k) → Number(fromWei(wei)).toFixed(k)
  root.find(j.CallExpression, { callee: { property: { name: 'toFixed' }}})
    .forEach(p => {
      const obj = p.node.callee.object;
      if (obj && obj.type === 'BinaryExpression' && obj.operator === '/' && isOneE18(obj.right)) {
        if (obj.left.type === 'CallExpression' && obj.left.callee.name === 'Number') {
          const arg = obj.left.arguments[0] || j.identifier('0');
          p.node.callee.object = j.callExpression(j.identifier('Number'), [
            j.callExpression(j.identifier('fromWei'), [arg])
          ]);
          transformCount++;
          console.log(`  ✅ Fixed: (Number(...)/1e18).toFixed() → Number(fromWei(...)).toFixed()`);
        }
      }
    });

  // 4. Fix: parseFloat(input.value) → parseEthInputOrThrow(input.value) [Frontend only]
  if (isFrontend) {
    root.find(j.CallExpression, { callee: { name: 'parseFloat' }})
      .forEach(p => {
        const arg = p.node.arguments[0];
        if (arg && arg.type === 'MemberExpression' && 
            arg.property && arg.property.name === 'value') {
          j(p).replaceWith(j.callExpression(j.identifier('parseEthInputOrThrow'), [arg]));
          transformCount++;
          console.log(`  ✅ Fixed: parseFloat(input.value) → parseEthInputOrThrow(input.value)`);
        }
      });
  }

  // 5. Fix fee calculations: amount * 0.03 → percentMul(amount, 300)
  root.find(j.BinaryExpression, { operator: '*' })
    .forEach(p => {
      const left = p.node.left;
      const right = p.node.right;
      
      // Check for percentage patterns
      if (right.type === 'Literal' && typeof right.value === 'number' && 
          right.value > 0 && right.value < 1) {
        const bps = Math.round(right.value * 10000);
        if (left.type === 'Identifier' && isMoneyVariable(left.name)) {
          j(p).replaceWith(
            j.callExpression(j.identifier('percentMul'), [
              left,
              j.literal(bps)
            ])
          );
          transformCount++;
          console.log(`  ✅ Fixed: ${left.name} * ${right.value} → percentMul(${left.name}, ${bps})`);
        }
      }
    });

  // 6. Fix Math operations on money variables
  root.find(j.CallExpression)
    .filter(p => 
      p.node.callee.type === 'MemberExpression' &&
      p.node.callee.object.name === 'Math' &&
      ['floor', 'ceil', 'round'].includes(p.node.callee.property.name)
    )
    .forEach(p => {
      const arg = p.node.arguments[0];
      if (arg && arg.type === 'Identifier' && isMoneyVariable(arg.name)) {
        // For frontend, keep the Math operation but add comment
        if (isFrontend) {
          // Leave as-is for display purposes
        } else {
          // Remove Math operation for backend BigInt values
          j(p).replaceWith(arg);
          transformCount++;
          console.log(`  ✅ Fixed: Math.${p.node.callee.property.name}(${arg.name}) → ${arg.name}`);
        }
      }
    });

  // 7. Fix balance arithmetic: balance + amount → add(balance, amount)
  root.find(j.BinaryExpression)
    .filter(p => ['+',' -'].includes(p.node.operator))
    .forEach(p => {
      const left = p.node.left;
      const right = p.node.right;
      
      if (left.type === 'Identifier' && isMoneyVariable(left.name) &&
          right.type === 'Identifier' && isMoneyVariable(right.name)) {
        const operation = p.node.operator === '+' ? 'add' : 'sub';
        j(p).replaceWith(
          j.callExpression(j.identifier(operation), [left, right])
        );
        transformCount++;
        console.log(`  ✅ Fixed: ${left.name} ${p.node.operator} ${right.name} → ${operation}(${left.name}, ${right.name})`);
      }
    });

  if (transformCount > 0) {
    ensureImports();
    console.log(`  🎯 Total transforms: ${transformCount}`);
  }

  return root.toSource({ quote: 'single', reuseParsers: true });
};

module.exports.parser = 'babylon';
