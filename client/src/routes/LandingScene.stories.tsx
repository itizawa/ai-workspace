import type { Meta, StoryObj } from "@storybook/react";

import { renderWithRouter } from "../mocks/RouterDecorator";

/**
 * LandingScene（/lp）のルートレベルストーリー。
 * RouterProvider（memory history）内で描画し、CTA の Link（→ /login）が正しく動く。
 */
const meta = {
  title: "routes/LandingScene",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** ランディングページ: 初期表示。ヒーロー + 中核の魅力 3 点 + CTA。 */
export const Default: Story = {
  render: () => renderWithRouter("/lp"),
};
