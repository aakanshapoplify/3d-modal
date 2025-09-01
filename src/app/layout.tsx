import Script from "next/script";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "CAD → 3D Walkthrough",
  description: "Upload CAD & Preview in 3D using Autodesk Forge",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Forge Viewer Styles */}
        <link
          rel="stylesheet"
          href="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css"
        />
      </head>
      <body className="bg-gray-50 text-gray-900">
        <Navbar />
        <main className="p-6">{children}</main>

        {/* Forge Viewer Script */}
        <Script
          src="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}





// import "./globals.css";
// import Navbar from "@/components/Navbar";
// import Script from "next/script";
// import { ReactNode } from "react";

// export const metadata = {
//   title: "CAD → 3D Walkthrough",
//   description: "Upload CAD & Preview in 3D using Autodesk Forge",
// };

// export default function RootLayout({ children }: { children: ReactNode }) {
//   return (
//     <html lang="en">
//       <head>
//         <link
//           rel="stylesheet"
//           href="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css"
//         />
//       </head>
//       <body className="bg-gray-50 text-gray-900">
//         <Navbar />
//         <main className="p-6">{children}</main>
//       </body>
//     </html>
//   );
// }
