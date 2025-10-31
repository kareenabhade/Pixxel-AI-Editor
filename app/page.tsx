import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="bg-black">
      Hey!
      <br />
      <Button variant="primary">click me!</Button>
      <Button variant="glass">click me!</Button>
    </div>
  );
}
