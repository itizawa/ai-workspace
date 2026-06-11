import { describe, expect, it } from "vitest";

import { GenerationOutputSchema, validateGenerationOutput } from "./generation.js";

describe("GenerationOutputSchema", () => {
  const validOutput = {
    topic: "AI ワーカーの日常あるある",
    posts: [
      {
        id: "post-1",
        author: "worker-haru",
        title: "今日のバグ修正話",
        text: "今日は謎のバグと格闘してたよ",
        comments: [
          {
            author: "worker-ken",
            text: "お疲れ様、どんなバグだった？",
          },
        ],
      },
    ],
  };

  it("有効な生成出力をパースできる", () => {
    const result = GenerationOutputSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
  });

  it("topic を持つ", () => {
    const result = GenerationOutputSchema.parse(validOutput);
    expect(result.topic).toBe("AI ワーカーの日常あるある");
  });

  it("posts 配列を持つ", () => {
    const result = GenerationOutputSchema.parse(validOutput);
    expect(result.posts).toHaveLength(1);
  });

  it("post は id / author / title / text / comments を持つ", () => {
    const result = GenerationOutputSchema.parse(validOutput);
    const post = result.posts[0];
    expect(post?.id).toBe("post-1");
    expect(post?.author).toBe("worker-haru");
    expect(post?.title).toBe("今日のバグ修正話");
    expect(post?.text).toBe("今日は謎のバグと格闘してたよ");
    expect(post?.comments).toHaveLength(1);
  });

  it("comment は author / text を持つ", () => {
    const result = GenerationOutputSchema.parse(validOutput);
    const comment = result.posts[0]?.comments[0];
    expect(comment?.author).toBe("worker-ken");
    expect(comment?.text).toBe("お疲れ様、どんなバグだった？");
  });

  it("score を含まない（事後更新フィールド・ADR-0019）", () => {
    const result = GenerationOutputSchema.parse(validOutput);
    const post = result.posts[0];
    expect("score" in (post ?? {})).toBe(false);
    const comment = post?.comments[0];
    expect("score" in (comment ?? {})).toBe(false);
  });

  it("posts が空配列を reject する（1件以上必須）", () => {
    const data = { ...validOutput, posts: [] };
    expect(GenerationOutputSchema.safeParse(data).success).toBe(false);
  });

  it("post の title が 100 文字を超えると reject する", () => {
    const data = {
      ...validOutput,
      posts: [{ ...validOutput.posts[0], title: "あ".repeat(101) }],
    };
    expect(GenerationOutputSchema.safeParse(data).success).toBe(false);
  });

  it("post の text が 1000 文字を超えると reject する", () => {
    const data = {
      ...validOutput,
      posts: [{ ...validOutput.posts[0], text: "あ".repeat(1001) }],
    };
    expect(GenerationOutputSchema.safeParse(data).success).toBe(false);
  });

  it("comment の text が 1000 文字を超えると reject する", () => {
    const data = {
      ...validOutput,
      posts: [
        {
          ...validOutput.posts[0],
          comments: [{ author: "worker-ken", text: "あ".repeat(1001) }],
        },
      ],
    };
    expect(GenerationOutputSchema.safeParse(data).success).toBe(false);
  });
});

describe("validateGenerationOutput", () => {
  const knownWorkerIds = ["worker-haru", "worker-ken", "worker-mei"];

  const validOutput = {
    topic: "AI ワーカーの日常あるある",
    posts: [
      {
        id: "post-1",
        author: "worker-haru",
        title: "今日のバグ修正話",
        text: "今日は謎のバグと格闘してたよ",
        comments: [
          {
            author: "worker-ken",
            text: "お疲れ様、どんなバグだった？",
          },
        ],
      },
    ],
  };

  it("既知の workerId のみ含む場合は検証を通る", () => {
    expect(() => validateGenerationOutput(validOutput, knownWorkerIds)).not.toThrow();
  });

  it("post の author が未知の workerId の場合はエラーを投げる", () => {
    const invalidOutput = {
      ...validOutput,
      posts: [
        {
          ...validOutput.posts[0],
          author: "unknown-worker",
        },
      ],
    };
    expect(() => validateGenerationOutput(invalidOutput, knownWorkerIds)).toThrow();
  });

  it("comment の author が未知の workerId の場合はエラーを投げる", () => {
    const invalidOutput = {
      ...validOutput,
      posts: [
        {
          ...validOutput.posts[0],
          comments: [{ author: "unknown-worker", text: "こんにちは" }],
        },
      ],
    };
    expect(() => validateGenerationOutput(invalidOutput, knownWorkerIds)).toThrow();
  });

  it("指定外の worker のみを許可する worker リストに対して reject する", () => {
    const restrictedWorkerIds = ["worker-haru"]; // worker-ken を除外
    const outputWithKen = {
      ...validOutput,
      posts: [
        {
          ...validOutput.posts[0],
          comments: [{ author: "worker-ken", text: "やあ" }],
        },
      ],
    };
    expect(() => validateGenerationOutput(outputWithKen, restrictedWorkerIds)).toThrow();
  });

  it("人間のユーザーが author として現れると reject する（ADR-0020）", () => {
    const outputWithHuman = {
      ...validOutput,
      posts: [
        {
          ...validOutput.posts[0],
          author: "human-user-123",
        },
      ],
    };
    expect(() => validateGenerationOutput(outputWithHuman, knownWorkerIds)).toThrow();
  });
});
