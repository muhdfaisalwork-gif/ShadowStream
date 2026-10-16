try {
  const p = require.resolve('@expo/cli', { paths: ['G:\\streaming app\\frontend'] });
  console.log(p);
} catch (e) {
  console.log('ERR:', e.message);
}
