export default function Head() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css"
      />
      {/* Preload can improve first paint for viewer fonts / core */}
      <link rel="preconnect" href="https://developer.api.autodesk.com" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </>
  );
}
