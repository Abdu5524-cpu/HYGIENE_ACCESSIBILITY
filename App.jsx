import "./App.css";
import { useState } from "react";

export default function App()
{
  const [popup, setPopup] = useState(false);

  function Click()
  {
    setPopup(!popup);
  }

  return (
    <>
    <h1>Hazard Hound</h1>
    <button class="profile" onClick={Click}></button>
    {popup && <img class="profileWindow"/>}
    </>
  )
}