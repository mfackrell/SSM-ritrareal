import { Storage } from "@google-cloud/storage";
import fs from "fs";

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

async function callSdxlManager(prompt) {
  const res = await fetch(
    "https://sdxl-manager-710616455963.us-central1.run.app",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    }
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`SDXL manager failed (${res.status}): ${txt}`);
  }

  const data = await res.json();

  if (data.status !== "success" || !data.public_url) {
    throw new Error(`SDXL manager returned invalid payload: ${JSON.stringify(data)}`);
  }

  return data.public_url;
}

export async function generateImages(promptSections) {
  console.log("Starting Sequential Image Generation...");

  const results = {};
  let loopIndex = 0;

  for (const [key, sectionText] of Object.entries(promptSections)) {
    console.log(`Generating ${key} (Index: ${loopIndex})...`);

    const timer = setInterval(() => {
      console.log(`...still waiting for SDXL on ${key} (30s elapsed)...`);
    }, 30000);

    try {
      const fullPrompt =
        `Create a cinematic, high-fidelity illustration. Use a realistic, detailed art style similar to concept art for a high-budget drama or thriller. Focus on dramatic lighting, emotional depth, and a compelling atmosphere. Ensure the illustration feels like a keyframe from a serious, engaging movie based on this story section: ${fullPrompt}`;

      const publicUrl = await callSdxlManager(fullPrompt);

      console.log(`Saved ${key} -> ${publicUrl}`);
      results[key] = publicUrl;
      loopIndex++;

    } catch (err) {
      console.error(`Failed to generate image for ${key}:`, err.message);
      results[key] = null;
      loopIndex++;

    } finally {
      clearInterval(timer);
    }
  }

  return results;
}
