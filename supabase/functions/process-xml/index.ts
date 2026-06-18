
// supabase/functions/process-xml/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { DOMParser, Element } from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts';

console.log(`Function "process-xml" up and running!`);

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Extraire le contenu du fichier XML de la requête
    const fileContent = await req.text();
    if (!fileContent) {
      throw new Error("Request body is empty. XML content is required.");
    }

    // 2. Parser le XML côté serveur
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(fileContent, "application/xml");

    if (xmlDoc.querySelector('parsererror')) {
      throw new Error("Malformed XML file.");
    }

    // 3. Extraire les données nécessaires
    const ctrlSumNode = xmlDoc.querySelector('CtrlSum');
    const reqdExctnDtNode = xmlDoc.querySelector('ReqdExctnDt');

    if (!ctrlSumNode) {
      throw new Error("<CtrlSum> tag not found in the XML file.");
    }

    const ctrlSumValue = parseFloat(ctrlSumNode.textContent || '0');
    const execDateValue = reqdExctnDtNode ? reqdExctnDtNode.textContent : '';

    // 4. Appliquer la logique de modification (protégée ici)
    let msgIdCounter = 1; // Le compteur est simple car on traite un fichier à la fois
    const msgIdNodes = xmlDoc.querySelectorAll('MsgId');
    
    msgIdNodes.forEach(node => {
      const originalMsgId = node.textContent || '';
      const newMsgId = `${originalMsgId.trim()} ${msgIdCounter}`;
      node.textContent = newMsgId;
      msgIdCounter++;
    });

    // 5. Sérialiser le document XML modifié en chaîne de caractères
    const modifiedContent = new XMLSerializer().serializeToString(xmlDoc);

    // 6. Renvoyer les résultats
    const data = {
      modifiedContent: modifiedContent,
      ctrlSum: ctrlSumValue,
      execDate: execDateValue,
    };

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
