"""
SHAP-based explainability for the symptom checker.
"""

from __future__ import annotations

import numpy as np

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False


class ShapExplainer:
    """SHAP TreeExplainer wrapper."""

    def __init__(self, model, feature_names):
        self.model = model
        self.feature_names = feature_names

        # CalibratedClassifierCV wraps the underlying tree model.
        # SHAP TreeExplainer does not support the calibration wrapper
        # directly, so explain the underlying Random Forest.
        base_model = model

        if hasattr(base_model, "calibrated_classifiers_"):
            base_model = base_model.calibrated_classifiers_[0].estimator

        self.explainer = shap.TreeExplainer(base_model)

    def top_contributors(
        self,
        x_row: np.ndarray,
        predicted_class_idx: int,
        top_n: int = 5,
    ):
        shap_values = self.explainer.shap_values(
            x_row.reshape(1, -1)
        )

        # SHAP versions/models can return either:
        #   list[n_classes] -> (1, n_features)
        # or:
        #   (1, n_features, n_classes)
        if isinstance(shap_values, list):
            class_values = shap_values[predicted_class_idx][0]
        elif getattr(shap_values, "ndim", 0) == 3:
            class_values = shap_values[0, :, predicted_class_idx]
        else:
            class_values = shap_values[0]

        present_idx = np.where(x_row == 1)[0]

        ranked = sorted(
            present_idx,
            key=lambda i: abs(class_values[i]),
            reverse=True,
        )

        top = ranked[:top_n]

        return [
            {
                "symptom": self.feature_names[i],
                "shap_value": round(float(class_values[i]), 4),
            }
            for i in top
        ]


class FallbackExplainer:
    """
    Feature-importance approximation used if SHAP isn't available.
    """

    def __init__(self, model, feature_names):
        base = model

        if hasattr(base, "calibrated_classifiers_"):
            base = base.calibrated_classifiers_[0].estimator

        self.importances = np.asarray(
            base.feature_importances_
        )
        self.feature_names = feature_names

    def top_contributors(
        self,
        x_row: np.ndarray,
        predicted_class_idx: int,
        top_n: int = 5,
    ):
        present_idx = np.where(x_row == 1)[0]

        ranked = sorted(
            present_idx,
            key=lambda i: self.importances[i],
            reverse=True,
        )

        top = ranked[:top_n]

        return [
            {
                "symptom": self.feature_names[i],
                "shap_value": round(float(self.importances[i]), 4),
            }
            for i in top
        ]


def get_explainer(model, feature_names):
    if HAS_SHAP:
        return ShapExplainer(model, feature_names)

    return FallbackExplainer(model, feature_names)