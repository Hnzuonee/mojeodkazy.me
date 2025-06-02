exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*', // Pro testování, v produkci specifikujte doménu
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
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
        
        const sessionId = body.session_id || "N/A_session"; // Přidáno
        const userAgent = body.userAgent || "N/A";
        const pageURL = body.pageURL || "N/A";
        const clientTimestamp = body.timestamp_client || "N/A";
        const eventName = body.event || "N/A_event"; // Přidáno
        const ageGateResponse = body.age_gate_response || null; // Přidáno (může být null)
        
        const ip = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || "N/A";
        const serverTimestamp = new Date().toISOString();

        const logEntry = {
            session_id: sessionId, // Přidáno do logu
            server_timestamp: serverTimestamp,
            client_timestamp: clientTimestamp,
            page_url: pageURL,
            user_agent: userAgent,
            client_ip: ip,
            event: eventName, // Přidáno do logu
        };

        if (ageGateResponse !== null) { // Přidáno do logu, pokud existuje
            logEntry.age_gate_response = ageGateResponse;
        }
        
        console.log("PAGE_EVENT_LOG:", JSON.stringify(logEntry, null, 2)); 
        
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ message: "Log received successfully" }),
        };
    } catch (error) {
        console.error("Error processing log request:", error);
        console.log("ERROR_LOG:", JSON.stringify({
            timestamp: new Date().toISOString(),
            error_message: error.message,
            raw_body: event.body 
        }, null, 2));

        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ message: "Error processing request", error: error.message }),
        };
    }
};
