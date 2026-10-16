console.log('expo:', require.resolve('expo', { paths: [process.cwd()] }));
try {
  console.log('@expo/cli:', require.resolve('@expo/cli', { paths: [process.cwd()] }));
} catch (e) {
  console.log('@expo/cli: NOT FOUND');
}
