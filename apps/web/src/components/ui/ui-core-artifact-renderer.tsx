import { Icon } from "../icon";
import { BottomSheet } from "./bottom-sheet";
import { CheckMatrix } from "./check-matrix";
import { ChipRows } from "./chip-rows";
import { LayerTabBar } from "./layer-tab-bar";
import { NumberedAccordion } from "./numbered-accordion";
import { SegmentedTabs } from "./segmented-tabs";
import { SupportCard } from "./support-card";
import { UiCard } from "./ui-card";
import { UiFieldShell } from "./ui-field-shell";

const tabs = [
  {
    id: "tong-quan",
    label: "Tổng quan",
    content: <p className="ui-artifact__content">Các điểm chính được trình bày rõ ràng để bạn tiếp tục xem xét.</p>,
  },
  {
    id: "can-cu",
    label: "Căn cứ",
    content: <p className="ui-artifact__content">Mỗi nhận định đi cùng căn cứ có thể mở để đối chiếu.</p>,
  },
  {
    id: "ghi-chu",
    label: "Ghi chú",
    content: <p className="ui-artifact__content">Bạn có thể lưu lại nội dung cần xem thêm sau khi đọc.</p>,
  },
];

/**
 * Internal-only composition used by the LSV-19 visual capture test.
 * It is deliberately not imported by an application route.
 */
export function UiCoreArtifactRenderer() {
  return (
    <main className="ui-artifact">
      <header className="ui-artifact__header">
        <p className="ui-artifact__kicker">Lá Số Việt</p>
        <h1 className="ui-artifact__title">Thông tin rõ ràng, thao tác gọn gàng</h1>
        <p className="ui-artifact__lead">Một bề mặt đọc và nhập liệu nhất quán cho hành trình riêng của bạn.</p>
      </header>

      <div className="ui-artifact__grid">
        <UiCard className="ui-artifact__section" highlighted>
          <UiFieldShell hint="Dùng để cá nhân hóa lá số của bạn." icon={<Icon name="user" />} label="Họ và tên">
            <input className="ui-field-shell__input" defaultValue="Nguyễn Minh An" name="fullName" />
          </UiFieldShell>
          <div className="ui-artifact__actions">
            <button className="ui-button" type="button">Xem lá số <Icon name="arrow-right" /></button>
            <button className="ui-button ui-button--secondary" type="button">Lưu lại</button>
          </div>
        </UiCard>

        <UiCard className="ui-artifact__section">
          <h2 className="ui-artifact__section-title">Nội dung phù hợp</h2>
          <SegmentedTabs defaultTabId="tong-quan" tabs={tabs} />
        </UiCard>

        <section className="ui-artifact__section ui-artifact__span-all">
          <LayerTabBar defaultTabId="can-cu" tabs={tabs} />
        </section>

        <UiCard className="ui-artifact__section">
          <h2 className="ui-artifact__section-title">Phần bạn nhận được</h2>
          <div className="ui-artifact__matrix">
            <CheckMatrix
              columns={[
                { id: "mien-phi", label: "Miễn phí" },
                { id: "day-du", label: "Đầy đủ" },
              ]}
              rows={[
                { id: "ban-menh", label: "Tổng quan bản mệnh", cells: { "mien-phi": true, "day-du": true } },
                { id: "can-cu", label: "Căn cứ luận giải", cells: { "mien-phi": true, "day-du": true } },
                { id: "chuyen-sau", label: "Các chủ đề chuyên sâu", cells: { "mien-phi": false, "day-du": true } },
              ]}
            />
          </div>
        </UiCard>

        <UiCard className="ui-artifact__section">
          <h2 className="ui-artifact__section-title">Điểm cần xem thêm</h2>
          <NumberedAccordion
            defaultOpenId="nhap-lieu"
            items={[
              { id: "nhap-lieu", title: "Kiểm tra thông tin đã nhập", content: <p>Ngày, giờ và nơi sinh cần phản ánh đúng dữ liệu bạn cung cấp.</p> },
              { id: "doi-chieu", title: "Đối chiếu căn cứ", content: <p>Các chi tiết được trình bày theo thứ tự dễ theo dõi.</p> },
              { id: "luu-tru", title: "Lưu lại để đọc sau", content: <p>Bạn có thể trở lại nội dung đã mở trong thư viện của mình.</p> },
            ]}
          />
        </UiCard>

        <section className="ui-artifact__span-all">
          <ChipRows
            firstRow={["Cung Mệnh", "Cung Tài Bạch", "Cung Quan Lộc", "Cung Thiên Di"]}
            secondRow={["Căn cứ", "Tứ Hóa", "Đại hạn", "Gợi ý chiêm nghiệm"]}
          />
        </section>

        <section className="ui-artifact__span-all">
          <SupportCard
            description="Gửi câu hỏi để đội ngũ hỗ trợ phản hồi qua email."
            email="support@lasoviet.net"
            title="Cần hỗ trợ?"
          />
        </section>

        <section className="ui-artifact__span-all ui-artifact__actions">
          <BottomSheet title="Lựa chọn đọc" triggerLabel="Mở lựa chọn">
            <p className="ui-artifact__content">Bạn có thể chọn phần muốn xem trước khi tiếp tục.</p>
          </BottomSheet>
        </section>
      </div>
    </main>
  );
}
