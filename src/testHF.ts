import "dotenv/config";
import axios from "axios";

async function test() {
  try {
    const response = await axios.post(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
      { inputs: "a cinematic historical scene, dramatic lighting" },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "image/png",
        },
        responseType: "arraybuffer",
        timeout: 90_000,
      },
    );
    console.log("✅ Success! Image size:", response.data.byteLength, "bytes");
  } catch (err: any) {
    const msg = err.response?.data
      ? Buffer.from(err.response.data).toString()
      : err.message;
    console.error("❌ Error:", msg);
  }
}

test();
