import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="wrap flex min-h-[65vh] flex-col items-center justify-center py-20 text-center">
      <p className="script text-3xl text-chili">oops</p>
      <h1 className="display mt-2 text-[clamp(4rem,12vw,8rem)]">404</h1>
      <p className="mt-2 max-w-[40ch] text-sm text-ink/55">
        This page slipped off the tray. The menu is still hot though.
      </p>
      <div className="mt-6 flex gap-2">
        <Link to="/" className="btn btn-sm">
          Back home
        </Link>
        <Link to="/menu" className="btn btn-accent btn-sm">
          See the menu
        </Link>
      </div>
    </div>
  );
}
