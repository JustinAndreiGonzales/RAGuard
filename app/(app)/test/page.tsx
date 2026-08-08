import Button from "@/components/Button";
import Input from "@/components/Input";
import TextArea from "@/components/TextArea";

const page = () => {
  return (
    <div className="h-4xl p-4 flex gap-md`">
      <div>
        <Button variant="primary" size="sm">
          Primary
        </Button>
        <Button variant="primary" size="md">
          Primary
        </Button>
        <Button variant="primary" size="lg">
          Primary
        </Button>
      </div>
      <Input />
      <Input placeholder="Enter text" />
      <Input placeholder="Enter text" label="Email" helperText="helper text" />
      <Input
        placeholder="Enter text"
        label="Email"
        state="error"
        errorText="Wrong pw"
      />
      <TextArea placeholder="Enter your prompt" disabled />
    </div>
  );
};

export default page;
