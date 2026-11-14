import { Node, mergeAttributes } from "@tiptap/core";

// Block nodes for uploaded video and audio, and for YouTube/Vimeo players.
const mediaNode = (name, tag, extra) =>
  Node.create({
    name, group: "block", atom: true, draggable: true,
    addAttributes() { return { src: { default: null } }; },
    parseHTML() { return [{ tag: `${tag}[src]` }]; },
    renderHTML({ HTMLAttributes }) { return [tag, mergeAttributes(extra, HTMLAttributes)]; },
    addCommands() { return { ["insert_" + name]: (attrs) => ({ commands }) => commands.insertContent({ type: name, attrs }) }; },
  });

export const Video = mediaNode("video", "video", { controls: "true", playsinline: "true", preload: "metadata" });
export const Audio = mediaNode("audio", "audio", { controls: "true", preload: "metadata" });
export const Embed = mediaNode("embed", "iframe", { allowfullscreen: "true", frameborder: "0", allow: "autoplay; fullscreen; picture-in-picture; encrypted-media" });
