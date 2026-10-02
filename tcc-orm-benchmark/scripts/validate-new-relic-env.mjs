const enabled = process.env.NEW_RELIC_ENABLED?.toLowerCase() !== 'false';

if (enabled) {
  const appName = process.env.NEW_RELIC_APP_NAME?.trim();
  const licenseKey = process.env.NEW_RELIC_LICENSE_KEY?.trim();
  const isPlaceholder = licenseKey
    ? /replace|your|sua|chave|license[_ -]?key/i.test(licenseKey)
    : true;
  const hasLegacyFormat = licenseKey ? /^[a-f\d]{40}$/i.test(licenseKey) : false;
  const hasNralFormat = licenseKey ? /^[a-z\d]+NRAL$/i.test(licenseKey) : false;

  if (!appName) {
    console.error('New Relic: NEW_RELIC_APP_NAME não foi definida em apps/.env.');
    process.exit(1);
  }

  if (!licenseKey || isPlaceholder || (!hasLegacyFormat && !hasNralFormat)) {
    console.error(
      'New Relic: NEW_RELIC_LICENSE_KEY não possui um formato reconhecido de License Key de ingestão.',
    );
    process.exit(1);
  }
}
