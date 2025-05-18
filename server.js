import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { htmlToText } from "html-to-text";

const app = express();
app.use(cors());
app.use(express.json());

export function cleanLeetCodeDescription(html) {
  return htmlToText(html, {
    wordwrap: 80,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'code', format: 'inline' },
      { selector: 'pre', format: 'block' },
    ],
  }).trim();
}

app.post("/api/leetcode", async (req, res) => {
  const { url } = req.body;

  try {
    const match = url.match(/^https:\/\/leetcode\.com\/problems\/([a-z0-9-]+)\/?$/);
    if (!match) {
      throw new Error("Invalid URL. Please enter a correct LeetCode problem URL.");
    }

    const slug = match[1];

    const query = `
      query getQuestionDetail($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          title
          content
          difficulty
          likes
          dislikes
          exampleTestcases
        }
      }
    `;

    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { titleSlug: slug },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch problem data. Please try again later.");
    }

    const json = await response.json();
    const question = json.data.question;

    if (!question) {
      throw new Error("Problem not found.");
    }

    res.json({
      title: question.title,
      description: cleanLeetCodeDescription(question.content),
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("cors")) {
        throw new Error(
          "CORS error: Please visit https://cors-anywhere.herokuapp.com/corsdemo to activate demo access"
        );
      }
    }
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Export the app as the default export for Vercel
export default app;
