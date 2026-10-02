import { MultiSelectField } from "@sphynx/ui/components/form/multi-select-field";
import { NumberField } from "@sphynx/ui/components/form/number-field";
import { SelectField } from "@sphynx/ui/components/form/select-field";
import { ShellField } from "@sphynx/ui/components/form/shell-field";
import { SubmitButton } from "@sphynx/ui/components/form/submit-button";
import { TagsField } from "@sphynx/ui/components/form/tags-field";
import { TextField } from "@sphynx/ui/components/form/text-field";
import { TextareaField } from "@sphynx/ui/components/form/textarea-field";
import { fieldContext, formContext } from "@sphynx/ui/hooks/form-context";
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
