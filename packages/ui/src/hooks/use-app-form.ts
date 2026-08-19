import { CodeField } from "@anpord/ui/components/form/code-field";
import { MultiSelectField } from "@anpord/ui/components/form/multi-select-field";
import { SelectField } from "@anpord/ui/components/form/select-field";
import { SubmitButton } from "@anpord/ui/components/form/submit-button";
import { TagsField } from "@anpord/ui/components/form/tags-field";
import { TextField } from "@anpord/ui/components/form/text-field";
import { fieldContext, formContext } from "@anpord/ui/hooks/form-context";
import { createFormHook } from "@tanstack/react-form";

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    CodeField,
    TextField,
    SelectField,
    MultiSelectField,
    TagsField,
  },
  formComponents: {
    SubmitButton,
  },
});
