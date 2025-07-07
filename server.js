const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

app.post("/xsearch", async (req, res) => {
  let authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  // 🛡 Add Bearer prefix if it's not already present
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    authHeader = `Bearer ${authHeader}`;
  }

  const {
    content,
    mode = "on",
    return_citations = false,
    from_date,
    to_date,
    max_search_results,
    sources,
    country,
    safe_search,
    excluded_websites,
    allowed_websites,
    included_x_handles,
    excluded_x_handles,
    post_favorite_count,
    post_view_count,
    links,
  } = req.body;

  if (!content) {
    return res.status(400).json({ error: "Missing required field: content" });
  }

  // Build dynamic sources array
  let finalSources = sources || [];

  // If user provided source-type filters without full source objects, patch them here
  if (
    country ||
    safe_search !== undefined ||
    excluded_websites ||
    allowed_websites
  ) {
    finalSources.push({
      type: "web",
      ...(country && { country }),
      ...(safe_search !== undefined && { safe_search }),
      ...(excluded_websites && { excluded_websites }),
      ...(allowed_websites && { allowed_websites }),
    });
  }

  if (
    included_x_handles ||
    excluded_x_handles ||
    post_favorite_count ||
    post_view_count
  ) {
    finalSources.push({
      type: "x",
      ...(included_x_handles && { included_x_handles }),
      ...(excluded_x_handles && { excluded_x_handles }),
      ...(post_favorite_count && { post_favorite_count }),
      ...(post_view_count && { post_view_count }),
    });
  }

  if (links) {
    finalSources.push({
      type: "rss",
      links: Array.isArray(links) ? links.slice(0, 1) : [links], // xAI supports only 1 RSS link
    });
  }

  // Remove empty source objects
  finalSources = finalSources.filter((src) => Object.keys(src).length > 1);

  const searchParams = {
    mode,
    return_citations,
  };

  if (from_date) searchParams.from_date = from_date;
  if (to_date) searchParams.to_date = to_date;
  if (max_search_results) searchParams.max_search_results = max_search_results;
  if (finalSources.length > 0) searchParams.sources = finalSources;

  const payload = {
    model: "grok-3",
    messages: [{ role: "user", content }],
    search_parameters: searchParams,
  };

  try {
    const response = await axios.post(
      "https://api.x.ai/v1/chat/completions",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
      }
    );

    const aiContent = response.data?.choices?.[0]?.message?.content || "";
    const citations = return_citations
      ? response.data?.citations || []
      : undefined;

    const result = { content: aiContent };
    if (citations) result.citations = citations;

    res.status(200).json(result);
  } catch (err) {
    console.error("❌ xAI API error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Failed to contact xAI API",
      details: err.response?.data || err.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
