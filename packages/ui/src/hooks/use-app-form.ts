import { MultiSelectField } from "@anpord/ui/components/form/multi-select-field";
import { NumberField } from "@anpord/ui/components/form/number-field";
import { SelectField } from "@anpord/ui/components/form/select-field";
import { ShellField } from "@anpord/ui/components/form/shell-field";
import { SubmitButton } from "@anpord/ui/components/form/submit-button";
import { TagsField } from "@anpord/ui/components/form/tags-field";
import { TextField } from "@anpord/ui/components/form/text-field";
import { TextareaField } from "@anpord/ui/components/form/textarea-field";
import { fieldContext, formContext } from "@anpord/ui/hooks/form-context";
import { createFormHook } from "@tanstack/react-form";

export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    MultiSelectField,
    NumberField,
    SelectField,
    ShellField,
    TagsField,
    TextareaField,
    TextField,
  },
  fieldContext,
  formComponents: {
    SubmitButton,
  },
  formContext,
});
