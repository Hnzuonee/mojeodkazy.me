exports.handler = async function(event, context) {
    // Povolíme CORS pro případ, že byste funkci volali z jiné domény během vývoje
    // V produkci zvažte specifičtější nastavení CORS hlaviček
    const headers = {
        'Access-Control-Allow-Origin': '*', // Pro testování, v produkci specifikujte doménu
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Netlify automaticky zpracuje OPTIONS požadavky pro CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // No Content
            headers: headers,
            body: ''
        };
    }
    
    if (event.httpMethod !== "POST") {
        return { 
            statusCode: 405, 
            headers: headers,
            body: "Method Not Allowed" 
        };
    }

    try {
        const body = JSON.parse(event.body);
        const userAgent = body.userAgent || "N/A";
        const pageURL = body.pageURL || "N/A";
        const clientTimestamp = body.timestamp_client || "N/A";
        
        // Získání IP adresy klienta z Netlify hlaviček
        const ip = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || "N/A";
        const serverTimestamp = new Date().toISOString();

        // Formátovaný logovací záznam
        const logEntry = {
            server_timestamp: serverTimestamp,
            client_timestamp: clientTimestamp,
            page_url: pageURL,
            user_agent: userAgent,
            client_ip: ip,
            // Můžete přidat další hlavičky nebo informace z 'event' objektu
            // např. event.headers['referer'], event.headers['accept-language'], atd.
            // request_headers: event.headers // Pro kompletní hlavičky (pozor na velikost logu)
        };
        
        // Toto se zapíše do Netlify Function logů
        console.log("PAGE_VISIT_LOG:", JSON.stringify(logEntry, null, 2)); 
        
        return {
            statusCode: 200,
            headers: headers, // Přidáme CORS hlavičky i k úspěšné odpovědi
            body: JSON.stringify({ message: "Log received successfully" }),
        };
    } catch (error) {
        console.error("Error processing log request:", error);
        // Logujeme chybu i do Netlify Function logů
        console.log("ERROR_LOG:", JSON.stringify({
            timestamp: new Date().toISOString(),
            error_message: error.message,
            raw_body: event.body // Pro ladění, co přišlo
        }, null, 2));

        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ message: "Error processing request", error: error.message }),
        };
    }
};
