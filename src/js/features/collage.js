const COLLAGE_WIDTH = 700;
const COLLAGE_HEIGHT = 420;

const outer = document.getElementById("collage-outer");
const sizer = document.getElementById("collage-sizer");
const inner = document.getElementById("collage-inner");

if (outer && sizer && inner) {
  const rescale = () => {
    const availableWidth = outer.clientWidth;
    const scale = Math.min(availableWidth / COLLAGE_WIDTH, 1);
    const scaledHeight = COLLAGE_HEIGHT * scale;
    const offsetX = (availableWidth - COLLAGE_WIDTH * scale) / 2;

    inner.style.transform = `translateX(${offsetX}px) scale(${scale})`;
    sizer.style.height = `${scaledHeight}px`;
  };

  rescale();
  new ResizeObserver(rescale).observe(outer);
}
